<script setup lang="ts">
const MONITOR_IDS = [1, 3, 4, 5, 6, 25, 13, 12, 24, 10]
const STATUS_PAGE_URL = 'https://up.qixz.cn/status/qxz'
const API_URL = 'https://up.qixz.cn/api/status-page/heartbeat/qxz'

interface Heartbeat {
	status: number
	time: string
	msg: string
	ping: number
}

interface HeartbeatResponse {
	heartbeatList: Record<string, Heartbeat[]>
}

const hasError = ref(false)
const data = ref<HeartbeatResponse | null>(null)
let refreshTimer: ReturnType<typeof setInterval> | null = null

async function fetchData() {
	try {
		const response = await $fetch<HeartbeatResponse>(API_URL)
		if (response?.heartbeatList) {
			const hasValidData = MONITOR_IDS.some(id => {
				const heartbeats = response.heartbeatList[id.toString()]
				return heartbeats && heartbeats.length > 0
			})
			if (hasValidData) {
				data.value = response
				hasError.value = false
			} else {
				hasError.value = true
			}
		} else {
			hasError.value = true
		}
	} catch (e) {
		console.error('Failed to fetch service status:', e)
		hasError.value = true
	}
}

onMounted(async () => {
	await fetchData()
	refreshTimer = setInterval(fetchData, 30000)
})

onUnmounted(() => {
	if (refreshTimer) {
		clearInterval(refreshTimer)
	}
})

const failedCount = computed(() => {
	if (!data.value?.heartbeatList) return 0
	let count = 0
	for (const id of MONITOR_IDS) {
		const heartbeats = data.value.heartbeatList[id.toString()]
		if (!heartbeats || heartbeats.length === 0) {
			count++
			continue
		}
		const latest = heartbeats.at(-1)
		if (!latest || latest.status !== 1) {
			count++
		}
	}
	return count
})

const statusType = computed(() => {
	if (hasError.value) return 'error'
	if (!data.value) return 'normal'
	if (failedCount.value === 0) return 'normal'
	if (failedCount.value === MONITOR_IDS.length) return 'all-failed'
	return 'partial-failed'
})

const statusText = computed(() => {
	if (hasError.value) return '监察御史开小差了'
	if (!data.value) return '所有服务正常'
	if (failedCount.value === 0) return '所有服务正常'
	if (failedCount.value === MONITOR_IDS.length) return '所有服务故障'
	return `共 ${failedCount.value} 个服务故障`
})
</script>

<template>
<ClientOnly>
	<Tooltip :delay="200" placement="top">
		<NuxtLink
			:to="STATUS_PAGE_URL"
			target="_blank"
			class="service-status"
			:class="`is-${statusType}`"
		>
			<span class="status-indicator">
				<span class="status-dot" />
			</span>
			<span class="status-text">{{ statusText }}</span>
		</NuxtLink>
		<template #content>
			<span>点击查看服务状态</span>
		</template>
	</Tooltip>
	<template #fallback>
		<span class="service-status is-normal">
			<span class="status-indicator">
				<span class="status-dot" />
			</span>
			<span class="status-text">所有服务正常</span>
		</span>
	</template>
</ClientOnly>
</template>

<style lang="scss" scoped>
.service-status {
	display: inline-flex;
	align-items: center;
	gap: 0.4em;
	margin-left: 1em;
	text-decoration: none;
	font-size: inherit;
	transition: color 0.2s;

	.status-indicator {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1em;
		height: 1em;
		border-radius: 50%;
	}

	.status-dot {
		width: 0.5em;
		height: 0.5em;
		border-radius: 50%;
	}

	&.is-normal {
		.status-indicator {
			background-color: #c5e5cd;
		}
		.status-dot {
			background-color: #57bd6a;
		}
		&:hover {
			color: #57bd6a;
		}
	}

	&.is-partial-failed, &.is-all-failed {
		.status-indicator {
			background-color: #f5c6c6;
		}
		.status-dot {
			background-color: #e05555;
		}
		&:hover {
			color: #e05555;
		}
	}

	&.is-error {
		.status-indicator {
			background-color: #f5e6c6;
		}
		.status-dot {
			background-color: #e0a555;
		}
		&:hover {
			color: #e0a555;
		}
	}
}
</style>
