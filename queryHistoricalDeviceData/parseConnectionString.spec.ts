import { parseConnectionString } from './parseConnectionString'

describe('parseConnectionString', () => {
	it('should parse a connection string', () => {
		expect(
			parseConnectionString(
				'AccountEndpoint=https://xxxx.documents.azure.com:443/;AccountKey=oKHTAxxx92GKkq3CDzeCd1WYnVslfIUaQqOa7Xw==;',
			),
		).toEqual({
			AccountEndpoint: 'https://xxxx.documents.azure.com:443/',
			AccountKey: 'oKHTAxxx92GKkq3CDzeCd1WYnVslfIUaQqOa7Xw==',
		})
	})
})
