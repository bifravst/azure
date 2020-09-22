export const parseConnectionString = (
	connectionString: string,
): { [key: string]: string } =>
	connectionString
		.replace(/;$/, '')
		.split(';')
		.reduce((conn, s) => {
			const [k] = s.split('=', 1)
			const v = s.replace(new RegExp(`^${k}=`), '')
			return {
				...conn,
				[k]: v,
			}
		}, {} as { [key: string]: string })
