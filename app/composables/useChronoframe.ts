import type { ChronoFrameAlbum, ChronoFramePhoto } from '~/types/chronoframe'
import blogConfig from '~~/blog.config'

export function useChronoframe() {
	const config = blogConfig.chronoframe
	const baseUrl = config.baseUrl
	const mapTilerKey = config.mapTilerKey

	const isConfigured = computed(() => Boolean(baseUrl))

	async function fetchPhotos(): Promise<ChronoFramePhoto[]> {
		if (!baseUrl) {
			throw new Error('ChronoFrame baseUrl is not configured')
		}

		try {
			const response = await fetch(`${baseUrl}/api/photos`)
			if (!response.ok) {
				throw new Error(`Failed to fetch photos: ${response.status}`)
			}
			return await response.json()
		}
		catch (error) {
			console.error('Failed to fetch ChronoFrame photos:', error)
			throw error
		}
	}

	async function fetchPhoto(photoId: string): Promise<ChronoFramePhoto> {
		if (!baseUrl) {
			throw new Error('ChronoFrame baseUrl is not configured')
		}

		try {
			const response = await fetch(`${baseUrl}/api/photos/${photoId}`)
			if (!response.ok) {
				throw new Error(`Failed to fetch photo: ${response.status}`)
			}
			return await response.json()
		}
		catch (error) {
			console.error('Failed to fetch ChronoFrame photo:', error)
			throw error
		}
	}

	async function fetchAlbums(): Promise<ChronoFrameAlbum[]> {
		if (!baseUrl) {
			throw new Error('ChronoFrame baseUrl is not configured')
		}

		try {
			const response = await fetch(`${baseUrl}/api/albums`)
			if (!response.ok) {
				throw new Error(`Failed to fetch albums: ${response.status}`)
			}
			return await response.json()
		}
		catch (error) {
			console.error('Failed to fetch ChronoFrame albums:', error)
			throw error
		}
	}

	function getPhotoUrl(photo: ChronoFramePhoto, type: 'original' | 'thumbnail' = 'thumbnail'): string {
		if (type === 'original') {
			if (photo.originalUrl?.startsWith('http')) {
				return photo.originalUrl
			}
			if (photo.originalUrl?.startsWith('/')) {
				return `${baseUrl}${photo.originalUrl}`
			}
			if (photo.storageKey?.startsWith('/')) {
				return `${baseUrl}${photo.storageKey}`
			}
			return `${baseUrl}/storage/${photo.storageKey}`
		}
		if (photo.thumbnailUrl?.startsWith('http')) {
			return photo.thumbnailUrl
		}
		if (photo.thumbnailUrl?.startsWith('/')) {
			return `${baseUrl}${photo.thumbnailUrl}`
		}
		if (photo.thumbnailKey?.startsWith('/')) {
			return `${baseUrl}${photo.thumbnailKey}`
		}
		return `${baseUrl}/storage/${photo.thumbnailKey}`
	}

	function getSatelliteMapUrl(latitude: number, longitude: number, zoom = 15): string {
		if (!mapTilerKey) {
			return ''
		}
		return `https://api.maptiler.com/maps/hybrid/static/${longitude},${latitude},${zoom}/400x300@2x.png?key=${mapTilerKey}`
	}

	function getOpenStreetMapUrl(latitude: number, longitude: number): string {
		return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr)
			return ''
		try {
			const date = new Date(dateStr)
			return date.toLocaleDateString('zh-CN', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			})
		}
		catch {
			return dateStr
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024)
			return `${bytes} B`
		if (bytes < 1024 * 1024)
			return `${(bytes / 1024).toFixed(1)} KB`
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	return {
		baseUrl,
		mapTilerKey,
		isConfigured,
		fetchPhotos,
		fetchPhoto,
		fetchAlbums,
		getPhotoUrl,
		getSatelliteMapUrl,
		getOpenStreetMapUrl,
		formatDate,
		formatFileSize,
	}
}
