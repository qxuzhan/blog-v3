export interface ChronoFramePhoto {
	id: string
	title: string | null
	description: string | null
	width: number
	height: number
	aspectRatio: number
	dateTaken: string | null
	storageKey: string
	thumbnailKey: string
	fileSize: number
	lastModified: string
	originalUrl: string
	thumbnailUrl: string
	thumbnailHash: string | null
	tags: string[]
	exif: ChronoFrameExif | null
	latitude: number | null
	longitude: number | null
	country: string | null
	city: string | null
	locationName: string | null
	isLivePhoto: boolean
	livePhotoVideoUrl: string | null
	livePhotoVideoKey: string | null
}

export interface ChronoFrameExif {
	Make?: string
	Model?: string
	Software?: string
	DateTimeOriginal?: string
	ExposureTime?: string | number
	FNumber?: number
	ISO?: number
	FocalLength?: string
	LensModel?: string
	ExposureProgram?: string
	ShutterSpeedValue?: string | number
	ApertureValue?: number
	BrightnessValue?: number
	MaxApertureValue?: number
	Orientation?: number
}

export interface ChronoFrameAlbum {
	id: number
	title: string
	description: string | null
	coverPhotoId: string | null
	createdAt: string
	updatedAt: string
	photoIds: string[]
}

export interface ChronoFramePhotosResponse {
	photos: ChronoFramePhoto[]
	total: number
}

export interface ChronoFrameAlbumsResponse {
	albums: ChronoFrameAlbum[]
	total: number
}
