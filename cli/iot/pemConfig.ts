export const caCertConfig = (commonName: string) =>
	[
		'[req]',
		'req_extensions = v3_req',
		'distinguished_name = req_distinguished_name',
		'x509_extensions = v3_ca',
		'[req_distinguished_name]',
		'commonName = ' + commonName,
		'[v3_req]',
		'basicConstraints = critical,CA:true',
	].join('\n')

export const leafCertConfig = (commonName: string) =>
	[
		'[req]',
		'req_extensions = v3_req',
		'distinguished_name = req_distinguished_name',
		'[req_distinguished_name]',
		'commonName = ' + commonName,
		'[v3_req]',
		'extendedKeyUsage = critical,clientAuth',
	].join('\n')
