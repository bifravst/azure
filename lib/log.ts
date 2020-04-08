import { Context } from '@azure/functions'

export const log = (context: Context) => (...args: any[]) =>
	context.log(...args.map(arg => JSON.stringify(arg, null, 2)))
