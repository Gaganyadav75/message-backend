import bcrypt from "bcryptjs";

const round = Number(process.env.SALTROUND)!;

export const SALT = bcrypt.genSaltSync(round);

