import { encode } from 'uqr'

/** The QR code for `text` as a grid of dark (true) and light modules, quiet zone included. */
export const qrModules = (text: string) => encode(text, { ecc: 'M', border: 2 }).data
