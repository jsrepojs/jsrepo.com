import bcrypt from 'bcryptjs';

export function hash(secret: string) {
	return bcrypt.hashSync(secret);
}

export function verify(secret: string, hash: string) {
	return bcrypt.compareSync(secret, hash);
}
