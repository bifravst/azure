import { ComandDefinition } from './CommandDefinition'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { promises as fs } from 'fs'
import chalk from 'chalk'
import { IotDpsClient } from '@azure/arm-deviceprovisioningservices'
import { Mqtt as MqttProvisioning } from 'azure-iot-provisioning-device-mqtt'
import { Mqtt as MqttDevice } from 'azure-iot-device-mqtt'
import { X509Security } from 'azure-iot-security-x509'
import { ProvisioningDeviceClient } from 'azure-iot-provisioning-device'
import { Client } from 'azure-iot-device'

export const connectCommand = ({
	certsDir,
	iotDpsClient
}: {
	iotDpsClient: () => Promise<IotDpsClient>
	certsDir: string
}): ComandDefinition => ({
	command: 'connect <deviceId>',
	action: async (deviceId: string) => {

		const deviceFiles = deviceFileLocations({
			certsDir,
			deviceId
		})

		const cert = {
			cert: await fs.readFile(deviceFiles.certWithChain, 'utf-8'),
			key: await fs.readFile(deviceFiles.privateKey, 'utf-8'),
		}

		let iotHub

		try {
			const registry = JSON.parse(await fs.readFile(deviceFiles.registry,
				'utf-8'))
			iotHub = registry.iotHub
		} catch {
			const armDpsClient = await iotDpsClient()

			// See https://github.com/Azure/azure-iot-sdk-node/blob/master/device/samples/simple_sample_device.js
			const dps = await armDpsClient.iotDpsResource.get('bifravstProvisioningService', 'bifravst')
			const dpsHostname = dps.properties.serviceOperationsHostName as string
			const idScope = dps.properties.idScope as string
			console.log(chalk.magenta(`Connecting to`), chalk.yellow(dpsHostname))
			console.log(chalk.magenta(`ID scope`), chalk.yellow(idScope))

			const deviceClient = ProvisioningDeviceClient.create(dpsHostname, idScope, new MqttProvisioning(), new X509Security(deviceId, cert));

			// Register the device.  Do not force a re-registration.
			const registry = await new Promise<{ iotHub: string }>((resolve, reject) => deviceClient.register((err, result) => {
				if (err) {
					return reject("error registering device: " + err)
				}
				if (!result) {
					return reject("Received no registration result!")
				}
				resolve({
					iotHub: result.assignedHub
				})
			}))

			iotHub = registry.iotHub

			console.log(chalk.magenta(`Device registration succeeded with IotHub`), chalk.yellow(iotHub))

			await fs.writeFile(deviceFiles.registry, JSON.stringify(registry, null, 2), 'utf-8')
		} finally {
			const connection = Client.fromConnectionString(`HostName=${iotHub};DeviceId=${deviceId};x509=true`, MqttDevice);

			connection.setOptions(cert);
			connection.open(err => {
				if (err) {
					console.error('Could not connect: ' + err.message);
					return
				}

				console.log(chalk.green('Device connected'), chalk.blueBright(deviceId))

				connection.on('message', msg => {
					console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
				});

				connection.on('error', err => {
					console.error(err.message);
				});

				connection.on('disconnect', () => {
					connection.removeAllListeners();
				});
			});
		}
	},
	help: 'Connect to the IoT Hub',
})

