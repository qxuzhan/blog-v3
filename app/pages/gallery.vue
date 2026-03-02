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
	getSatelliteMapUrl,
	getOpenStreetMapUrl,
	formatDate,
	formatFileSize,
	mapTilerKey,
} = useChronoframe()

const photos = ref<ChronoFramePhoto[]>([])
const isLoading = ref(true)
const loadError = ref(false)
const selectedPhoto = ref<ChronoFramePhoto | null>(null)
const showLightbox = ref(false)
const lightboxImageLoaded = ref(false)

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

function openPhoto(photo: ChronoFramePhoto) {
	selectedPhoto.value = photo
	showLightbox.value = true
	lightboxImageLoaded.value = false
}

function closeLightbox() {
	showLightbox.value = false
	selectedPhoto.value = null
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === 'Escape' && showLightbox.value) {
		closeLightbox()
	}
	if (showLightbox.value) {
		if (e.key === 'ArrowLeft') {
			navigatePhoto('prev')
		}
		else if (e.key === 'ArrowRight') {
			navigatePhoto('next')
		}
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
		lightboxImageLoaded.value = false
	}
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
							@load="(e: Event) => (e.target as HTMLElement)?.classList.add('loaded')"
						>
						<img
							:src="getPhotoUrl(photo, 'original')"
							:alt="photo.title || '照片'"
							class="image-full"
							loading="lazy"
							@load="(e: Event) => (e.target as HTMLElement)?.classList.add('loaded')"
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

			<div class="lightbox-content">
				<div class="lightbox-image-container">
					<img
						:src="getPhotoUrl(selectedPhoto, 'thumbnail')"
						:alt="selectedPhoto.title || '照片'"
						class="lightbox-image thumb"
						:class="{ hidden: lightboxImageLoaded }"
					>
					<img
						:src="getPhotoUrl(selectedPhoto, 'original')"
						:alt="selectedPhoto.title || '照片'"
						class="lightbox-image full"
						:class="{ visible: lightboxImageLoaded }"
						@load="lightboxImageLoaded = true"
					>
					<div v-if="!lightboxImageLoaded" class="loading-spinner">
						<Icon name="ph:spinner-bold" class="spin" />
					</div>
				</div>

				<div class="lightbox-sidebar">
					<div class="sidebar-section">
						<div v-if="selectedPhoto.title" class="info-title">
							{{ selectedPhoto.title }}
						</div>
						<div v-if="selectedPhoto.description" class="info-desc">
							{{ selectedPhoto.description }}
						</div>
					</div>

					<div v-if="selectedPhoto.latitude && selectedPhoto.longitude && mapTilerKey" class="sidebar-section">
						<h4 class="section-title">
							<Icon name="ph:map-pin-bold" />
							拍摄地点
						</h4>
						<a
							:href="getOpenStreetMapUrl(selectedPhoto.latitude, selectedPhoto.longitude)"
							target="_blank"
							rel="noopener noreferrer"
							class="map-container"
						>
							<img
								:src="getSatelliteMapUrl(selectedPhoto.latitude, selectedPhoto.longitude)"
								alt="拍摄地点卫星地图"
								class="satellite-map"
								loading="lazy"
							>
							<div class="map-overlay">
								<span v-if="selectedPhoto.locationName">{{ selectedPhoto.locationName }}</span>
								<span v-else-if="selectedPhoto.city">{{ selectedPhoto.city }}{{ selectedPhoto.country ? `, ${selectedPhoto.country}` : '' }}</span>
								<span v-else>查看大图</span>
								<Icon name="ph:arrow-square-out-bold" />
							</div>
						</a>
					</div>

					<div class="sidebar-section">
						<h4 class="section-title">
							<Icon name="ph:info-bold" />
							详细信息
						</h4>
						<div class="info-meta">
							<div v-if="selectedPhoto.dateTaken" class="meta-item">
								<Icon name="ph:calendar-bold" />
								<span class="meta-label">拍摄时间</span>
								<span class="meta-value">{{ formatDate(selectedPhoto.dateTaken) }}</span>
							</div>
							<div v-if="selectedPhoto.exif?.Make || selectedPhoto.exif?.Model" class="meta-item">
								<Icon name="ph:camera-bold" />
								<span class="meta-label">相机</span>
								<span class="meta-value">{{ selectedPhoto.exif?.Make }} {{ selectedPhoto.exif?.Model }}</span>
							</div>
							<div v-if="selectedPhoto.exif?.LensModel" class="meta-item">
								<Icon name="ph:aperture-bold" />
								<span class="meta-label">镜头</span>
								<span class="meta-value">{{ selectedPhoto.exif?.LensModel }}</span>
							</div>
							<div v-if="selectedPhoto.exif?.FocalLength" class="meta-item">
								<Icon name="ph:crosshair-bold" />
								<span class="meta-label">焦距</span>
								<span class="meta-value">{{ selectedPhoto.exif?.FocalLength }}</span>
							</div>
							<div v-if="selectedPhoto.exif?.FNumber" class="meta-item">
								<Icon name="ph:circle-bold" />
								<span class="meta-label">光圈</span>
								<span class="meta-value">f/{{ selectedPhoto.exif?.FNumber }}</span>
							</div>
							<div v-if="selectedPhoto.exif?.ExposureTime" class="meta-item">
								<Icon name="ph:timer-bold" />
								<span class="meta-label">快门</span>
								<span class="meta-value">{{ selectedPhoto.exif?.ExposureTime }}s</span>
							</div>
							<div v-if="selectedPhoto.exif?.ISO" class="meta-item">
								<Icon name="ph:sun-bold" />
								<span class="meta-label">ISO</span>
								<span class="meta-value">{{ selectedPhoto.exif?.ISO }}</span>
							</div>
							<div v-if="selectedPhoto.width && selectedPhoto.height" class="meta-item">
								<Icon name="ph:frame-corners-bold" />
								<span class="meta-label">分辨率</span>
								<span class="meta-value">{{ selectedPhoto.width }} x {{ selectedPhoto.height }}</span>
							</div>
							<div v-if="selectedPhoto.fileSize" class="meta-item">
								<Icon name="ph:file-bold" />
								<span class="meta-label">文件大小</span>
								<span class="meta-value">{{ formatFileSize(selectedPhoto.fileSize) }}</span>
							</div>
						</div>
					</div>

					<div v-if="selectedPhoto.tags?.length" class="sidebar-section">
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

.lightbox-content {
  display: flex;
  gap: 1.5rem;
  max-width: 95vw;
  max-height: 90vh;
  background: var(--c-bg-1);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgb(0 0 0 / 40%);

  @media (max-width: 900px) {
    flex-direction: column;
    max-height: 95vh;
    overflow-y: auto;
  }
}

.lightbox-image-container {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--c-bg-2);
  min-height: 300px;

  @media (max-width: 900px) {
    max-height: 50vh;
  }
}

.lightbox-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  transition: opacity 0.3s;

  @media (max-width: 900px) {
    max-height: 50vh;
  }

  &.thumb {
    filter: blur(20px);
    transform: scale(1.02);

    &.hidden {
      opacity: 0;
    }
  }

  &.full {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;

    &.visible {
      opacity: 1;
    }
  }
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  color: var(--c-text-3);

  .spin {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.lightbox-sidebar {
  width: 320px;
  flex-shrink: 0;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  @media (max-width: 900px) {
    width: 100%;
    max-height: none;
  }
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--c-text-2);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--c-text-1);
  line-height: 1.3;
}

.info-desc {
  font-size: 0.9rem;
  color: var(--c-text-2);
  line-height: 1.6;
}

.map-container {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;

  &:hover .map-overlay {
    opacity: 1;
  }
}

.satellite-map {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.map-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(0 0 0 / 70%), transparent 50%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0.75rem;
  color: white;
  font-size: 0.85rem;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.info-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--c-text-2);

  .icon {
    font-size: 1rem;
    color: var(--c-text-3);
    flex-shrink: 0;
  }
}

.meta-label {
  flex-shrink: 0;
  min-width: 70px;
  color: var(--c-text-3);
}

.meta-value {
  color: var(--c-text-1);
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.6rem;
  background: var(--c-bg-soft);
  border-radius: 4px;
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
