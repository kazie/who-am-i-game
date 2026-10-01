// No 0/O, 1/I/L: room codes get read out loud.
const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 5

export function randomRoomCode(rng: () => number = Math.random) {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++)
    code += ROOM_ALPHABET[Math.floor(rng() * ROOM_ALPHABET.length)]
  return code
}

export function normalizeRoomCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export const isRoomCode = (code: string) =>
  code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_ALPHABET.includes(c))

export function randomId() {
  return crypto.randomUUID()
}
