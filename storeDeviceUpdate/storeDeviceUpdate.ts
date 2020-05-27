import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { log } from '../lib/log'
import { v4 } from 'uuid'
import {
	BlobServiceClient,
	StorageSharedKeyCredential,
} from '@azure/storage-blob'

const fotaStorageAccountName = process.env.FOTA_STORAGE_ACCOUNT_NAME ?? ''
const fotaStorageAccessKey = process.env.FOTA_STORAGE_ACCESS_KEY ?? ''
const fotaStorageContainer = process.env.FOTA_STORAGE_CONTAINER ?? ''

const sharedKeyCredential = new StorageSharedKeyCredential(
	fotaStorageAccountName,
	fotaStorageAccessKey,
)
const blobServiceClient = new BlobServiceClient(
	`https://${fotaStorageAccountName}.blob.core.windows.net`,
	sharedKeyCredential,
)
const containerClient = blobServiceClient.getContainerClient(
	fotaStorageContainer,
)

const storeDeviceUpdate: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	const { body, ...rest } = req
	log(context)({
		req: rest,
		fotaStorageAccountName,
		fotaStorageAccessKey,
		bodyLength: body.length,
	})
	try {
		const id = v4()
		const firmwareFile = Buffer.from(body, 'base64')
		const blobName = `${id}.bin`
		const blockBlobClient = containerClient.getBlockBlobClient(blobName)
		const uploadBlobResponse = await blockBlobClient.upload(
			firmwareFile,
			firmwareFile.length,
			{
				blobHTTPHeaders: {
					blobContentType: 'text/octet-stream',
					blobCacheControl: 'public, max-age=31536000',
				},
			},
		)
		log(context)(
			`Upload block blob ${blobName} successfully`,
			uploadBlobResponse.requestId,
		)

		const url = `https://${fotaStorageAccountName}.blob.core.windows.net/${fotaStorageContainer}/${blobName}`

		context.res = r({ success: true, url })
	} catch (error) {
		log(context)({
			error: error.message,
		})
		context.res = r(error, 500)
	}
}

export default storeDeviceUpdate
