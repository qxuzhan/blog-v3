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
const isLoading = ref(true)
const loadError = ref(false)
const selectedPhoto = ref<ChronoFramePhoto | null>(null)
const showLightbox = ref(false)
const lightboxImageLoaded = ref(false)
const showBoundaryTip = ref('')
let boundaryTipTimer: ReturnType<typeof setTimeout> | null = null

const currentIndex = computed(() => {
	if (!selectedPhoto.value)
		return -1
	return photos.value.findIndex(p => p.id === selectedPhoto.value?.id)
})

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
	lightboxImageLoaded.value = false
}

function showTip(tip: string) {
	showBoundaryTip.value = tip
	if (boundaryTipTimer) {
		clearTimeout(boundaryTipTimer)
	}
	boundaryTipTimer = setTimeout(() => {
		showBoundaryTip.value = ''
	}, 1500)
}

function navigatePhoto(direction: 'prev' | 'next') {
	if (!selectedPhoto.value || photos.value.length === 0)
		return

	const index = currentIndex.value
	if (index === -1)
		return

	let newIndex: number

	if (direction === 'prev') {
		if (index === 0) {
			showTip('已经是第一张了')
			return
		}
		newIndex = index - 1
	}
	else {
		if (index === photos.value.length - 1) {
			showTip('已经是最后一张了')
			return
		}
		newIndex = index + 1
	}

	const newPhoto = photos.value[newIndex]
	if (newPhoto) {
		selectedPhoto.value = newPhoto
		lightboxImageLoaded.value = false
	}
}

function handleKeydown(e: KeyboardEvent) {
	if (!showLightbox.value)
		return

	if (e.key === 'Escape') {
		closeLightbox()
	}
	else if (e.key === 'ArrowLeft') {
		navigatePhoto('prev')
	}
	else if (e.key === 'ArrowRight') {
		navigatePhoto('next')
	}
}

onMounted(() => {
	loadPhotos()
	document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown)
	if (boundaryTipTimer) {
		clearTimeout(boundaryTipTimer)
	}
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

			<Transition name="tip">
				<div v-if="showBoundaryTip" class="boundary-tip">
					{{ showBoundaryTip }}
				</div>
			</Transition>

			<div class="lightbox-content">
				<div class="lightbox-image-container">
					<img
						:src="getPhotoUrl(selectedPhoto, 'thumbnail')"
						:alt="selectedPhoto.title || '照片'"
						class="lightbox-image thumb"
						:class="{ hidden: lightboxImageLoaded }"
					>
					<img
						v-show="lightboxImageLoaded"
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

				<div class="lightbox-info">
					<div class="info-header">
						<div v-if="selectedPhoto.title" class="info-title">
							{{ selectedPhoto.title }}
						</div>
						<div v-if="selectedPhoto.description" class="info-desc">
							{{ selectedPhoto.description }}
						</div>
					</div>

					<div class="info-meta">
						<div v-if="selectedPhoto.dateTaken" class="meta-item">
							<Icon name="ph:calendar-bold" />
							<span>{{ formatDate(selectedPhoto.dateTaken) }}</span>
						</div>
						<div v-if="selectedPhoto.locationName" class="meta-item">
							<Icon name="ph:map-pin-bold" />
							<span>{{ selectedPhoto.locationName }}</span>
						</div>
						<div v-if="selectedPhoto.exif?.Make || selectedPhoto.exif?.Model" class="meta-item">
							<Icon name="ph:camera-bold" />
							<span>{{ selectedPhoto.exif?.Make }} {{ selectedPhoto.exif?.Model }}</span>
						</div>
						<div v-if="selectedPhoto.fileSize" class="meta-item">
							<Icon name="ph:file-bold" />
							<span>{{ formatFileSize(selectedPhoto.fileSize) }}</span>
						</div>
						<div v-if="selectedPhoto.width && selectedPhoto.height" class="meta-item">
							<Icon name="ph:frame-corners-bold" />
							<span>{{ selectedPhoto.width }} x {{ selectedPhoto.height }}</span>
						</div>
					</div>

					<div v-if="selectedPhoto.tags?.length" class="info-tags">
						<span v-for="tag in selectedPhoto.tags" :key="tag" class="tag">
							{{ tag }}
						</span>
					</div>

					<div class="info-counter">
						{{ currentIndex + 1 }} / {{ photos.length }}
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

.image-thumb {
  width: 100%;
  height: auto;
  display: block;
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

.boundary-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0.75rem 1.5rem;
  background: rgb(0 0 0 / 70%);
  color: white;
  border-radius: 8px;
  font-size: 0.9rem;
  z-index: 1002;
  pointer-events: none;
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.3s;
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
}

.lightbox-content {
  display: flex;
  gap: 1.5rem;
  max-width: 95vw;
  max-height: 90vh;
  align-items: center;
}

.lightbox-image-container {
  position: relative;
  flex-shrink: 0;
  max-width: 65vw;
  max-height: 85vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 30%);
  transition: opacity 0.4s ease;

  &.thumb {
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
  color: white;

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

.lightbox-info {
  width: 280px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1.5rem;
  background: rgb(0 0 0 / 40%);
  border-radius: 12px;
  color: white;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.info-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.info-desc {
  font-size: 0.9rem;
  opacity: 0.8;
  line-height: 1.6;
}

.info-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.9;

  .icon {
    font-size: 1rem;
    opacity: 0.7;
  }
}

.info-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(255 255 255 / 10%);
}

.tag {
  padding: 0.25rem 0.6rem;
  background: rgb(255 255 255 / 15%);
  border-radius: 4px;
  font-size: 0.8rem;
}

.info-counter {
  padding-top: 1rem;
  border-top: 1px solid rgb(255 255 255 / 10%);
  font-size: 0.85rem;
  opacity: 0.7;
  text-align: center;
}

@media (max-width: 768px) {
  .lightbox-content {
    flex-direction: column;
    max-height: none;
    overflow-y: auto;
  }

  .lightbox-image-container {
    max-width: 90vw;
    max-height: 50vh;
  }

  .lightbox-info {
    width: 100%;
    max-width: 90vw;
    max-height: none;
  }
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
