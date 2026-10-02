import { AppError } from '../../common/errors/AppError';
import { isStaff, JwtUserPayload } from '../../common/types';
import { isReferencedRow, queryOne } from '../../common/utils/db';
import { withTransaction } from '../../config/database';
import { addressesRepository, AddressRecord } from './addresses.repository';
import { CreateAddressDto, UpdateAddressDto } from './addresses.schema';

/** Utilizador normal só mexe nas suas moradas; staff pode agir em nome de outros utilizadores. */
async function resolveTargetUser(actor: JwtUserPayload, requestedUserId?: number): Promise<number> {
  if (requestedUserId === undefined || requestedUserId === actor.id) return actor.id;
  if (!isStaff(actor.role)) throw AppError.forbidden('Não pode gerir moradas de outro utilizador');

  const target = await queryOne<{ id: number }>('SELECT id FROM users WHERE id = ?', [requestedUserId]);
  if (!target) throw AppError.notFound('Utilizador não encontrado');
  return requestedUserId;
}

async function loadOwned(actor: JwtUserPayload, id: number): Promise<AddressRecord> {
  const address = await addressesRepository.findById(id);
  // 404 (e não 403) para não revelar que a morada existe
  if (!address || (address.user_id !== actor.id && !isStaff(actor.role))) {
    throw AppError.notFound('Morada não encontrada');
  }
  return address;
}

export const addressesService = {
  async list(actor: JwtUserPayload, requestedUserId?: number): Promise<AddressRecord[]> {
    const userId = await resolveTargetUser(actor, requestedUserId);
    return addressesRepository.listByUser(userId);
  },

  async create(actor: JwtUserPayload, dto: CreateAddressDto): Promise<AddressRecord> {
    const userId = await resolveTargetUser(actor, dto.userId);

    const id = await withTransaction(async (conn) => {
      const existing = await addressesRepository.countByUser(userId, conn);
      const makeDefault = dto.isDefault === true || existing === 0; // a 1.ª morada é sempre a predefinida
      if (makeDefault) await addressesRepository.clearDefault(userId, conn);
      return addressesRepository.insert(conn, userId, dto, makeDefault);
    });

    return (await addressesRepository.findById(id))!;
  },

  async update(actor: JwtUserPayload, id: number, dto: UpdateAddressDto): Promise<AddressRecord> {
    const address = await loadOwned(actor, id);

    await withTransaction(async (conn) => {
      if (dto.isDefault === true) await addressesRepository.clearDefault(address.user_id, conn);
      // Não permitir ficar sem morada predefinida por desmarcar a única predefinida
      const isDefault = dto.isDefault === false && address.is_default ? true : dto.isDefault;
      await addressesRepository.update(conn, id, dto, isDefault);
    });

    return (await addressesRepository.findById(id))!;
  },

  async remove(actor: JwtUserPayload, id: number): Promise<void> {
    const address = await loadOwned(actor, id);

    try {
      await withTransaction(async (conn) => {
        await addressesRepository.delete(conn, id);
        if (address.is_default) await addressesRepository.promoteOldest(conn, address.user_id);
      });
    } catch (err) {
      if (isReferencedRow(err)) {
        throw AppError.conflict('Esta morada já foi usada em encomendas ou entregas e não pode ser removida');
      }
      throw err;
    }
  },
};
