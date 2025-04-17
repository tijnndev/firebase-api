import { Logger } from '@aparajita/capacitor-logger'

const logger = new Logger(import.meta.env.VITE_LOGGER_PACKAGE_NAME)
export default logger