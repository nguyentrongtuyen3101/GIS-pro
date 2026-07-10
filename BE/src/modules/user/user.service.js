import prisma from "../../prisma/client.js";
import { ConflictException } from "../../utils/exceptions.utils.js";

class UserService {
  async createOrGetUser(data) {
    let user = await prisma.user.findUnique({
      where: {
        username: data.username,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: data.username,
        },
      });
    }

    return user;
  }
}

export default new UserService();