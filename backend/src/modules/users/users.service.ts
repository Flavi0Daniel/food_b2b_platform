import { AppError } from '../../common/errors/AppError';
import { hashPassword } from '../../common/utils/password';
import { SafeUser, toSafeUser } from '../../common/types';
import { usersRepository } from './users.repository';
import { CreateInternalUserDto, ListUsersQuery, UpdateUserStatusDto } from './users.schema';

export const usersService = {
  async createInternalUser(dto: CreateInternalUserDto): Promise<SafeUser> {
    const existing = await usersRepository.findByEmail(dto.email);
    if (existing) {
      throw AppError.conflict('Já existe um utilizador com este email');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await usersRepository.create(dto, passwordHash);
    return toSafeUser(user);
  },

  async listUsers(filters: ListUsersQuery): Promise<SafeUser[]> {
    const users = await usersRepository.list(filters);
    return users.map(toSafeUser);
  },

  async updateStatus(id: number, dto: UpdateUserStatusDto): Promise<SafeUser> {
    const user = await usersRepository.findById(id);
    if (!user) throw AppError.notFound('Utilizador não encontrado');
    if (user.role === 'ADMIN') {
      throw AppError.forbidden('Não é possível alterar o estado de uma conta Admin por esta via');
    }

    await usersRepository.updateStatus(id, dto);
    const updated = await usersRepository.findById(id);
    return toSafeUser(updated!);
  },
};
