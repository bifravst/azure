import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import { r } from '../lib/http'
import { v4 } from 'uuid'
import {
	BlobServiceClient,
	StorageSharedKeyCredential,
} from '@azure/storage-blob'

const avatarStorageAccountName = process.env.AVATAR_STORAGE_ACCOUNT_NAME || ''
const avatarStorageAccessKey = process.env.AVATAR_STORAGE_ACCESS_KEY || ''
const avatarStorageContainer = process.env.AVATAR_STORAGE_CONTAINER || ''

const sharedKeyCredential = new StorageSharedKeyCredential(
	avatarStorageAccountName,
	avatarStorageAccessKey,
)
const blobServiceClient = new BlobServiceClient(
	`https://${avatarStorageAccountName}.blob.core.windows.net`,
	sharedKeyCredential,
)
const containerClient = blobServiceClient.getContainerClient(
	avatarStorageContainer,
)

const storeImage: AzureFunction = async (
	context: Context,
	req: HttpRequest,
): Promise<void> => {
	const { body, rawBody, ...rest } = req
	context.log({
		req: JSON.stringify(rest),
		avatarStorageAccountName,
		avatarStorageAccessKey,
		bodyLength: body.length,
	})

	const image = Buffer.from(body, 'base64')
	const blobName = `${v4()}.jpg`
	const blockBlobClient = containerClient.getBlockBlobClient(blobName)
	const uploadBlobResponse = await blockBlobClient.upload(image, image.length, {
		blobHTTPHeaders: {
			blobContentType: 'image/jpeg',
			blobCacheControl: 'public, max-age=31536000',
		},
	})
	console.log(
		`Upload block blob ${blobName} successfully`,
		uploadBlobResponse.requestId,
	)

	context.res = r({
		url: `https://${avatarStorageAccountName}.blob.core.windows.net/${avatarStorageContainer}/${blobName}`,
	})
}

export default storeImage
