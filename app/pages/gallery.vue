<script setup lang="ts">
import type { ChronoFramePhoto } from '~/types/chronoframe'
import { LazyPopoverLightbox } from '#components'

const layoutStore = useLayoutStore()
layoutStore.setAside([])

const title = '图驿：记录美好瞬间'
const description = '记录生活中的美好瞬间，用镜头捕捉世界的精彩。'
useSeoMeta({ title, description })

const {
	isConfigured,
	fetchPhotos,
	getPhotoUrl,
	formatDate,
} = useChronoframe()

const photos = ref<ChronoFramePhoto[]>([])
const isLoading = ref(true)
const loadError = ref(false)
const currentPhotoIndex = ref(0)

const popoverStore = usePopoverStore()

const currentPhotoEl = ref<HTMLImageElement>()
const currentPhoto = computed(() => photos.value[currentPhotoIndex.value])

const { open, close } = popoverStore.use(
	() => {
		if (!currentPhotoEl.value || !currentPhoto.value)
			return h('div')
		return h(LazyPopoverLightbox, {
			el: currentPhotoEl.value,
			caption: currentPhoto.value.title || currentPhoto.value.description || '',
		})
	},
	{ unique: true },
)

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

function openPhoto(photo: ChronoFramePhoto, event: MouseEvent) {
	const index = photos.value.findIndex(p => p.id === photo.id)
	if (index === -1)
		return
	currentPhotoIndex.value = index
	currentPhotoEl.value = event.target as HTMLImageElement
	open()
}

onMounted(() => {
	loadPhotos()
})
</script>

<template>
<h1 class="sr-only">
	图驿
</h1>

<div class="gallery-container full-width">
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
			>
				<div class="image-wrapper">
					<img
						:src="getPhotoUrl(photo, 'thumbnail')"
						:alt="photo.title || '照片'"
						class="image-thumb"
						loading="lazy"
						@click="openPhoto(photo, $event)"
						@load="(e: Event) => (e.target as HTMLElement)?.classList.add('loaded')"
					>
					<img
						:src="getPhotoUrl(photo, 'original')"
						:alt="photo.title || '照片'"
						class="image-full"
						loading="lazy"
						@click="openPhoto(photo, $event)"
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
</template>

<style lang="scss" scoped>
.gallery-container {
  animation: float-in .2s backwards;
  margin: 1rem;

  &.full-width {
    margin: 0;
    padding: 1rem;
  }
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
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
  column-count: 2;
  column-gap: 0.75rem;

  @media (min-width: 640px) {
    column-count: 3;
  }

  @media (min-width: 1024px) {
    column-count: 4;
  }

  @media (min-width: 1280px) {
    column-count: 5;
  }

  @media (min-width: 1536px) {
    column-count: 6;
  }
}

.masonry-item {
  break-inside: avoid;
  margin-bottom: 0.75rem;
  animation: float-in 0.3s backwards;
  animation-delay: var(--delay);
  border-radius: 8px;
  overflow: hidden;
  cursor: zoom-in;
  box-shadow: 0 0 0 1px var(--c-bg-soft);
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--ld-shadow);

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

.gallery-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(0 0 0 / 70%) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: flex-end;
  padding: 0.75rem;
  pointer-events: none;
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
  font-size: 0.9rem;
  margin-bottom: 0.2rem;
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
  font-size: 1rem;
  margin: 1.5rem 0;
  text-align: center;
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
