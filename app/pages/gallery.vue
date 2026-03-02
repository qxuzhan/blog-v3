<script setup lang="ts">
import type { ChronoFramePhoto } from '~/types/chronoframe'

const layoutStore = useLayoutStore()
layoutStore.setAside([])

useSeoMeta({
	title: '青序图驿 - 记录美好瞬间',
	description: '青序图驿，记录生活中的美好瞬间，用镜头捕捉世界的精彩。Light traces, time stays.',
	ogTitle: '青序图驿',
	ogDescription: '记录生活中的美好瞬间，用镜头捕捉世界的精彩。',
})

const {
	isConfigured,
	fetchPhotos,
	getPhotoUrl,
	formatDate,
	formatFileSize,
} = useChronoframe()

const photos = ref<ChronoFramePhoto[]>([])
const loadedImages = ref<Set<string>>(new Set())
const isLoading = ref(true)
const loadError = ref(false)
const selectedPhoto = ref<ChronoFramePhoto | null>(null)
const showLightbox = ref(false)

async function loadPhotos() {
	if (!isConfigured.value) {
		isLoading.value = false
		return
	}

	isLoading.value = true
	loadError.value = false

	try {
		photos.value = await fetchPhotos()
	}
	catch (error) {
		console.error('获取图片数据失败:', error)
		loadError.value = true
	}
	finally {
		isLoading.value = false
	}
}

function onImageLoaded(photoId: string) {
	loadedImages.value.add(photoId)
}

function isImageLoaded(photoId: string) {
	return loadedImages.value.has(photoId)
}

function openPhoto(photo: ChronoFramePhoto) {
	selectedPhoto.value = photo
	showLightbox.value = true
}

function closeLightbox() {
	showLightbox.value = false
	selectedPhoto.value = null
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && showLightbox.value) {
		closeLightbox()
	}
}

function navigatePhoto(direction: 'prev' | 'next') {
	if (!selectedPhoto.value)
		return
	const currentIndex = photos.value.findIndex(p => p.id === selectedPhoto.value?.id)
	if (currentIndex === -1)
		return
	const newIndex = direction === 'prev'
		? (currentIndex - 1 + photos.value.length) % photos.value.length
		: (currentIndex + 1) % photos.value.length
	const newPhoto = photos.value[newIndex]
	if (newPhoto) {
		selectedPhoto.value = newPhoto
	}
}

function getMapEmbedUrl(photo: ChronoFramePhoto) {
	if (!photo.latitude || !photo.longitude)
		return null
	const lat = photo.latitude
	const lon = photo.longitude
	const delta = 0.005
	return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lon}`
}

function getMapUrl(photo: ChronoFramePhoto) {
	if (!photo.latitude || !photo.longitude)
		return null
	return `https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=15/${photo.latitude}/${photo.longitude}`
}

onMounted(() => {
	loadPhotos()
	document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
<div class="gallery-page">
	<header class="gallery-header">
		<h1 class="gallery-title">
			青序图驿
		</h1>
		<p class="gallery-slogan">
			Light traces, time stays.
		</p>
	</header>

	<div class="gallery-container">
		<template v-if="!isConfigured">
			<div class="not-configured">
				<Icon name="ph:image-broken-bold" class="icon" />
				<h3>图驿服务未配置</h3>
				<p>请在 blog.config.ts 中配置 chronoframe.baseUrl</p>
			</div>
		</template>

		<template v-else-if="isLoading">
			<div class="loading-state">
				<div v-for="i in 12" :key="`skeleton-${i}`" class="skeleton-item">
					<div class="skeleton-image" />
				</div>
			</div>
		</template>

		<template v-else-if="loadError">
			<div class="error-state">
				<div class="error-content">
					<Icon name="ph:alert-circle-bold" class="error-icon" />
					<h3>加载失败</h3>
					<p>获取图片数据时出现错误，请稍后重试</p>
					<button class="retry-btn" @click="loadPhotos">
						<Icon name="ph:refresh-bold" />
						重试
					</button>
				</div>
			</div>
		</template>

		<template v-else-if="photos.length === 0">
			<div class="empty-state">
				<Icon name="ph:images-bold" class="empty-icon" />
				<p>暂无图片</p>
			</div>
		</template>

		<template v-else>
			<div class="masonry-grid">
				<div
					v-for="(photo, index) in photos"
					:key="photo.id"
					class="masonry-item"
					:style="{ '--delay': `${index * 0.03}s` }"
					@click="openPhoto(photo)"
				>
					<div class="image-wrapper">
						<img
							:src="getPhotoUrl(photo, 'thumbnail')"
							:alt="photo.title || '照片'"
							class="image-thumb"
							loading="lazy"
							@load="(e: Event) => { (e.target as HTMLElement)?.classList.add('loaded'); onImageLoaded(photo.id); }"
						>
						<img
							:src="getPhotoUrl(photo, 'original')"
							:alt="photo.title || '照片'"
							class="image-full"
							loading="lazy"
							@load="(e: Event) => { (e.target as HTMLElement)?.classList.add('loaded'); onImageLoaded(photo.id); }"
						>
						<div class="gallery-overlay">
							<div class="overlay-content">
								<Icon name="ph:arrows-out-bold" class="expand-icon" />
								<div v-if="photo.title" class="photo-title">
									{{ photo.title }}
								</div>
								<div v-if="photo.dateTaken" class="photo-date">
									{{ formatDate(photo.dateTaken) }}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="gallery-footer">
				<p>共 {{ photos.length }} 张照片</p>
			</div>
		</template>
	</div>
</div>

<Teleport to="body">
	<Transition name="lightbox">
		<div v-if="showLightbox && selectedPhoto" class="lightbox" @click.self="closeLightbox">
			<button class="lightbox-close" @click="closeLightbox">
				<Icon name="ph:x-bold" />
			</button>

			<button class="lightbox-nav prev" @click="navigatePhoto('prev')">
				<Icon name="ph:caret-left-bold" />
			</button>

			<button class="lightbox-nav next" @click="navigatePhoto('next')">
				<Icon name="ph:caret-right-bold" />
			</button>

			<div class="lightbox-body">
				<div class="lightbox-image-container">
					<img
						:src="isImageLoaded(selectedPhoto.id) ? getPhotoUrl(selectedPhoto, 'original') : getPhotoUrl(selectedPhoto, 'thumbnail')"
						:alt="selectedPhoto.title || '照片'"
						class="lightbox-image"
						:class="{ 'is-thumb': !isImageLoaded(selectedPhoto.id) }"
					>
				</div>

				<div class="lightbox-sidebar">
					<div class="sidebar-content">
						<div v-if="selectedPhoto.title" class="info-title">
							{{ selectedPhoto.title }}
						</div>
						<div v-if="selectedPhoto.description" class="info-desc">
							{{ selectedPhoto.description }}
						</div>

						<div class="info-section">
							<h4 class="section-title">
								<Icon name="ph:info-bold" />
								基本信息
							</h4>
							<div class="info-list">
								<div v-if="selectedPhoto.dateTaken" class="info-item">
									<span class="label">拍摄时间</span>
									<span class="value">{{ formatDate(selectedPhoto.dateTaken) }}</span>
								</div>
								<div v-if="selectedPhoto.locationName" class="info-item">
									<span class="label">拍摄地点</span>
									<span class="value">{{ selectedPhoto.locationName }}</span>
								</div>
								<div v-if="selectedPhoto.fileSize" class="info-item">
									<span class="label">文件大小</span>
									<span class="value">{{ formatFileSize(selectedPhoto.fileSize) }}</span>
								</div>
								<div v-if="selectedPhoto.width && selectedPhoto.height" class="info-item">
									<span class="label">图片尺寸</span>
									<span class="value">{{ selectedPhoto.width }} x {{ selectedPhoto.height }}</span>
								</div>
							</div>
						</div>

						<div v-if="selectedPhoto.exif?.Make || selectedPhoto.exif?.Model" class="info-section">
							<h4 class="section-title">
								<Icon name="ph:camera-bold" />
								相机信息
							</h4>
							<div class="info-list">
								<div v-if="selectedPhoto.exif?.Make" class="info-item">
									<span class="label">品牌</span>
									<span class="value">{{ selectedPhoto.exif.Make }}</span>
								</div>
								<div v-if="selectedPhoto.exif?.Model" class="info-item">
									<span class="label">型号</span>
									<span class="value">{{ selectedPhoto.exif.Model }}</span>
								</div>
								<div v-if="selectedPhoto.exif?.FocalLength" class="info-item">
									<span class="label">焦距</span>
									<span class="value">{{ selectedPhoto.exif.FocalLength }}</span>
								</div>
								<div v-if="selectedPhoto.exif?.FNumber" class="info-item">
									<span class="label">光圈</span>
									<span class="value">f/{{ selectedPhoto.exif.FNumber }}</span>
								</div>
								<div v-if="selectedPhoto.exif?.ExposureTime" class="info-item">
									<span class="label">快门</span>
									<span class="value">{{ selectedPhoto.exif.ExposureTime }}s</span>
								</div>
								<div v-if="selectedPhoto.exif?.ISO" class="info-item">
									<span class="label">ISO</span>
									<span class="value">{{ selectedPhoto.exif.ISO }}</span>
								</div>
							</div>
						</div>

						<div v-if="selectedPhoto.latitude && selectedPhoto.longitude" class="info-section">
							<h4 class="section-title">
								<Icon name="ph:map-pin-bold" />
								拍摄位置
							</h4>
							<div class="map-container">
								<iframe
									:src="getMapEmbedUrl(selectedPhoto)!"
									class="map-iframe"
									loading="lazy"
									frameborder="0"
									scrolling="no"
								/>
								<a
									:href="getMapUrl(selectedPhoto)!"
									target="_blank"
									rel="noopener"
									class="map-link"
								>
									<Icon name="ph:arrows-out-bold" />
									全屏查看
								</a>
							</div>
						</div>

						<div v-if="selectedPhoto.tags?.length" class="info-section">
							<h4 class="section-title">
								<Icon name="ph:tag-bold" />
								标签
							</h4>
							<div class="info-tags">
								<span v-for="tag in selectedPhoto.tags" :key="tag" class="tag">
									{{ tag }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</Teleport>
</template>

<style lang="scss" scoped>
.gallery-page {
  min-height: 100vh;
}

.gallery-header {
  text-align: center;
  padding: 3rem 1rem 2rem;
}

.gallery-title {
  margin: 0 0 0.3em;
  color: transparent;
  font-family: var(--font-stroke-free);
  font-size: clamp(2rem, 8vw, 4rem);
  font-weight: 800;
  line-height: 1;
  mask-image: linear-gradient(#FFF 50%, transparent);
  -webkit-text-stroke: 1px var(--c-text-2);
}

.gallery-slogan {
  margin: 0;
  font-size: 0.9rem;
  color: var(--c-text-3);
  font-style: italic;
  letter-spacing: 0.1em;
  opacity: 0.8;
}

.gallery-container {
  animation: float-in .2s backwards;
  padding: 0 1rem;
}

.not-configured,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--c-bg-soft);
  margin: 1rem 0;

  .icon,
  .error-icon,
  .empty-icon {
    font-size: 3rem;
    color: var(--c-text-3);
    margin-bottom: 1rem;
  }

  h3 {
    font-size: 1.2rem;
    margin: 0 0 0.5rem;
    color: var(--c-text-1);
  }

  p {
    color: var(--c-text-3);
    margin: 0;
  }
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.retry-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background-color: var(--c-primary);
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 1rem;

  &:hover {
    background-color: var(--c-primary-hover);
    transform: translateY(-1px);
  }
}

.loading-state {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin: 1rem 0;

  @media (min-width: 640px) {
    gap: 0.75rem;
  }
}

.skeleton-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.skeleton-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, var(--c-bg-2) 25%, var(--c-bg-soft) 50%, var(--c-bg-2) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.masonry-grid {
  column-count: 3;
  column-gap: 0.5rem;

  @media (min-width: 640px) {
    column-gap: 0.75rem;
  }

  @media (min-width: 1024px) {
    column-count: 3;
    column-gap: 1rem;
  }
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 0.5rem;
  animation: float-in 0.3s backwards;
  animation-delay: var(--delay);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--c-bg-soft);
  transition: transform 0.3s, box-shadow 0.3s;

  @media (min-width: 640px) {
    margin-bottom: 0.75rem;
  }

  @media (min-width: 1024px) {
    margin-bottom: 1rem;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px var(--ld-shadow);

    .gallery-overlay {
      opacity: 1;
    }
  }
}

.image-wrapper {
  position: relative;
  width: 100%;
  line-height: 0;
}

.image-thumb,
.image-full {
  width: 100%;
  height: auto;
  display: block;
  transition: opacity 0.5s ease, filter 0.5s ease;
}

.image-thumb {
  filter: blur(10px);

  &.loaded {
    filter: blur(0);
  }
}

.image-full {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;

  &.loaded {
    opacity: 1;
  }
}

.masonry-item:hover .image-full {
  opacity: 1;
}

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(0 0 0 / 70%) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
}

.overlay-content {
  color: white;
  width: 100%;
}

.expand-icon {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-size: 1.25rem;
  opacity: 0.8;
}

.photo-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-date {
  font-size: 0.75rem;
  opacity: 0.8;
}

.gallery-footer {
  color: var(--c-text-3);
  font-size: 0.9rem;
  margin: 2rem 0;
  text-align: center;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: transparent;
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 30%);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1001;

  &:hover {
    background: rgb(0 0 0 / 50%);
  }
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 50%;
  background: rgb(0 0 0 / 30%);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 1001;

  &:hover {
    background: rgb(0 0 0 / 50%);
  }

  &.prev {
    left: 1rem;
  }

  &.next {
    right: 1rem;
  }
}

.lightbox-body {
  display: flex;
  max-width: 95vw;
  max-height: 90vh;
  background: var(--c-bg-1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgb(0 0 0 / 30%);

  @media (max-width: 1023px) {
    flex-direction: column;
    max-width: 90vw;
  }
}

.lightbox-image-container {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-2);
  min-height: 300px;

  @media (min-width: 1024px) {
    max-width: 65%;
  }
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;

  &.is-thumb {
    filter: blur(5px);
  }

  @media (max-width: 1023px) {
    max-height: 50vh;
  }
}

.lightbox-sidebar {
  width: 320px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--c-bg-1);
  border-left: 1px solid var(--c-bg-soft);

  @media (max-width: 1023px) {
    width: 100%;
    max-height: 40vh;
    border-left: none;
    border-top: 1px solid var(--c-bg-soft);
  }
}

.sidebar-content {
  padding: 1.5rem;
}

.info-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--c-text-1);
}

.info-desc {
  font-size: 0.9rem;
  color: var(--c-text-2);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.info-section {
  margin-bottom: 1.5rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-text-2);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;

  .label {
    color: var(--c-text-3);
  }

  .value {
    color: var(--c-text-1);
    font-weight: 500;
  }
}

.map-container {
  border-radius: 8px;
  overflow: hidden;
  background: var(--c-bg-2);
}

.location-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--c-bg-2);
}

.location-icon {
  font-size: 1.5rem;
  color: var(--c-primary);
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--c-text-1);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-coords {
  font-size: 0.75rem;
  color: var(--c-text-3);
  font-family: monospace;
}

.map-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--c-primary);
  text-decoration: none;
  transition: background 0.2s;

  &:hover {
    background: var(--c-bg-soft);
  }
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  background: var(--c-bg-soft);
  border-radius: 20px;
  font-size: 0.8rem;
  color: var(--c-text-2);
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

@keyframes float-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
