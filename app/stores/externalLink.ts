export interface ExternalLinkState {
	show: boolean
	url: string
	linkRect: DOMRect | null
	target: string | undefined
}

export const useExternalLinkStore = defineStore('externalLink', () => {
	const state = ref<ExternalLinkState>({
		show: false,
		url: '',
		linkRect: null,
		target: undefined,
	})

	function open(url: string, linkRect: DOMRect, target?: string) {
		state.value = {
			show: true,
			url,
			linkRect,
			target,
		}
	}

	function close() {
		state.value.show = false
	}

	function confirm() {
		if (state.value.url) {
			window.open(state.value.url, state.value.target || '_blank', 'noopener,noreferrer')
		}
		close()
	}

	return {
		state,
		open,
		close,
		confirm,
	}
})
