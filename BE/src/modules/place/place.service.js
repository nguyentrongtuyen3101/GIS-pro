import prisma from "../../prisma/client.js";
import { ConflictException } from "../../utils/exceptions.utils.js";
import {DUPLICATE_NAME_SIMILARITY_THRESHOLD,DUPLICATE_DISTANCE_METERS,EXACT_MATCH_DISTANCE_METERS} from "../../config/duplicate.config.js";
import GeoString from "../../utils/geo-string.utils.js";

class PlaceService {

    async createPlace(userId, dto) {
        let newPlace;
        try {
        newPlace = await prisma.place.create({
            data: {
            userId,
            clientId: dto.clientId,
            deviceId: dto.deviceId,
            name: dto.name,
            nameNormalized: dto.nameNormalized,
            lat: dto.lat,
            lng: dto.lng,
            status: "synced",
            syncedAt: new Date(),
            },
        });
        } 
        catch (error) {
        if (error.code === "P2002") {const existing = await prisma.place.findUnique({
            where: {uniq_user_client_id: {userId,clientId: dto.clientId,},},
            });
            return { place: existing, isNew: false };
        }
        throw error;
        }
        const { autoDeleted, canonicalPlace } = await this.flagPotentialDuplicates(newPlace);
 
        if (autoDeleted) return { newPlace: canonicalPlace, isNew: false };

        return { newPlace, isNew: true };
    }

    async flagPotentialDuplicates(newPlace) {
        const candidates = await prisma.place.findMany({
        where: {
            userId: newPlace.userId,
            id: { not: newPlace.id },
            isDeleted: false,
        },
        });
    
        let exactMatch = null;
        const probableDuplicateIds = [];
    
        for (const candidate of candidates) 
        {
            const nameScore = GeoString.similarity(candidate.nameNormalized,newPlace.nameNormalized);
            const distance = GeoString.distanceInMeters(candidate.lat,candidate.lng,newPlace.lat,newPlace.lng);
    
            if (distance > DUPLICATE_DISTANCE_METERS) continue;
    
            if (nameScore === 1 && distance <= EXACT_MATCH_DISTANCE_METERS) {
                exactMatch = candidate;
                break;
            }
    
            if (nameScore >= DUPLICATE_NAME_SIMILARITY_THRESHOLD) {
                probableDuplicateIds.push(candidate.id);
            }
        }
    
        if (exactMatch) {
            await prisma.place.update({where: { id: newPlace.id },data: { isDeleted: true, status: "synced" },});
            return { autoDeleted: true, canonicalPlace: exactMatch };
        }
        if (probableDuplicateIds.length === 0) return { autoDeleted: false, canonicalPlace: null };
        
        const existingGroup = await prisma.potentialDuplicate.findFirst({where: {userId: newPlace.userId,isDeleted: false,placeIds: { hasSome: probableDuplicateIds },},});
    
        if (existingGroup) {
            const mergedPlaceIds = Array.from(new Set([...existingGroup.placeIds, newPlace.id, ...probableDuplicateIds]));

            await prisma.potentialDuplicate.update({
                where: { id: existingGroup.id },
                data: { placeIds: mergedPlaceIds },
            });
            return { autoDeleted: false, canonicalPlace: null };
        }
    
        await prisma.potentialDuplicate.create({
            data: {
                userId: newPlace.userId,
                placeIds: [newPlace.id, ...probableDuplicateIds],
            },
        });
    
        return { autoDeleted: false, canonicalPlace: null };
    }
    

    async getPlacesByUser(userId) {
        var places = await prisma.place.findMany({where: {userId,isDeleted: false,},orderBy: {createdAt: "desc",},});
        return places;
    }

    async findNearbyPlaces(userId, lat, lng, radiusMeters) {
        const places = await prisma.place.findMany({where: { userId, isDeleted: false },});
        return places
        .map((place) => ({
            ...place,
            distance: GeoString.distanceInMeters(place.lat, place.lng, lat, lng),
        }))
        .filter((place) => place.distance <= radiusMeters)
        .sort((a, b) => a.distance - b.distance);
    }


    async deletePlace(placeIds) {
        return prisma.place.updateMany({
        where: { id: { in: placeIds } },
        data: {
            isDeleted: true,
            status: "synced",},
        });
    }


    async getPotentialDuplicates(userId) {
        const duplicateGroups = await prisma.potentialDuplicate.findMany({where: { userId, isDeleted: false },});
        return Promise.all(
        duplicateGroups.map(async (group) => {
            const places = await prisma.place.findMany({
            where: { id: { in: group.placeIds }, isDeleted: false },
            select: { id: true, name: true, createdAt: true },
            });
        return {duplicateGroupId: group.id,places,};}));
    }


    async deletePotentialDuplicate(id) { 
        return prisma.potentialDuplicate.update({
        where: { id },
        data: { isDeleted: true },
        });
    }
}

export default new PlaceService();