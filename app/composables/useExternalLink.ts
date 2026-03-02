interface ExternalLinkOptions {
	whitelist?: string[]
	enabled?: boolean
}

const defaultWhitelist = [
	'qixz.cn',
	'localhost',
]

export function useExternalLink(options: ExternalLinkOptions = {}) {
	const appConfig = useAppConfig()
	const {
		whitelist = appConfig.component?.externalLink?.whitelist ?? defaultWhitelist,
		enabled = appConfig.component?.externalLink?.enabled ?? true,
	} = options

	const externalLinkStore = useExternalLinkStore()

	function isExternalLink(url: string): boolean {
		try {
			const urlObj = new URL(url, window.location.origin)
			const currentHost = window.location.hostname
			return urlObj.hostname !== currentHost
		}
		catch {
			return false
		}
	}

	function isInWhitelist(url: string): boolean {
		try {
			const urlObj = new URL(url, window.location.origin)
			return whitelist.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`))
		}
		catch {
			return false
		}
	}

	function isNoFollowLink(link: HTMLAnchorElement): boolean {
		const feedCard = link.closest('.feed-card')
		if (!feedCard)
			return false

		const feedGroup = feedCard.closest('.feed-group')
		if (!feedGroup)
			return false

		const groupTitle = feedGroup.querySelector('.feed-title')
		if (!groupTitle)
			return false

		const titleText = groupTitle.textContent || ''
		return titleText !== '『失联友友』'
	}

	function shouldShowDialog(url: string, link: HTMLAnchorElement): boolean {
		if (!enabled)
			return false
		if (!isExternalLink(url))
			return false
		if (isInWhitelist(url))
			return false
		if (isNoFollowLink(link))
			return false
		return true
	}

	function handleExternalLink(url: string, target: string | undefined, linkRect: DOMRect) {
		externalLinkStore.open(url, linkRect, target)
	}

	function setupGlobalInterceptor() {
		useEventListener(document, 'click', (e) => {
			const target = e.target as HTMLElement
			const link = target.closest('a') as HTMLAnchorElement | null

			if (!link)
				return

			const href = link.getAttribute('href')
			if (!href)
				return

			if (href.startsWith('#'))
				return

			if (href.startsWith('mailto:'))
				return

			if (href.startsWith('tel:'))
				return

			if (href.startsWith('javascript:'))
				return

			if (shouldShowDialog(href, link)) {
				e.preventDefault()
				const targetAttr = link.getAttribute('target') as string | undefined
				const linkRect = link.getBoundingClientRect()
				handleExternalLink(href, targetAttr, linkRect)
			}
		}, { capture: true })
	}

	return {
		handleExternalLink,
		setupGlobalInterceptor,
		isExternalLink,
		isInWhitelist,
		shouldShowDialog,
	}
}
