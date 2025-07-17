import User from "../models/User";

export const deleteUserByEmail = async (email: string) => {
  const user = await User.findOneAndDelete({ email });
  if (!user) throw new Error("User not found");
  return user;
};
