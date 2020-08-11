import { v4 } from 'uuid'

export const randomEmail = (): string => `${v4()}@example.com`
