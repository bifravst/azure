import { ComandDefinition } from './CommandDefinition'
import { deviceFileLocations } from '../iot/deviceFileLocations'
import { Mqtt } from 'azure-iot-device-mqtt'
import { Client } from 'azure-iot-device'
import { promises as fs } from 'fs'
import chalk from 'chalk'

export const connectCommand = ({
	certsDir,
	ioTHubDPSConnectionString
}: {
	ioTHubDPSConnectionString: string
	certsDir: string
}): ComandDefinition => ({
	command: 'connect <deviceId>',
	action: async (deviceId: string) => {

		const certs = deviceFileLocations({
			certsDir,
			deviceId
		})

		// See https://github.com/Azure/azure-iot-sdk-node/blob/master/device/samples/simple_sample_device.js
		const dpsHostname = ioTHubDPSConnectionString.split(';')[0].split('=')[1]
		const connectionString = `HostName=${dpsHostname};DeviceId=${deviceId};x509=true`
		console.log(chalk.green(`Connecting to`), chalk.yellow(connectionString))
		const client = Client.fromConnectionString(connectionString, Mqtt);
		client.setOptions({
			cert: (await fs.readFile(certs.certWithCA, 'utf-8')).toString(),
			key: (await fs.readFile(certs.privateKey, 'utf-8')).toString(),
		});

		client.open(err => {
			if (err) {
				throw new Error('Could not connect: ' + err.message)
			}
			console.log('Client connected');
			client.on('error', (err) => {
				console.error(err.message);
			});

			client.on('disconnect', () => {
				client.removeAllListeners();
			});

		})
	},
	help: 'Connect to the IoT Hub',
})

