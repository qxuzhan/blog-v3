interface ExternalLinkOptions {
	whitelist?: string[]
	enabled?: boolean
	/** 页面白名单，支持指定页面路径或正则表达式 */
	pageWhitelist?: (string | RegExp)[]
	/** 页面黑名单，支持指定页面路径或正则表达式 */
	pageBlacklist?: (string | RegExp)[]
}

const defaultWhitelist = [
	'qixz.cn',
	'localhost',
]

let ExternalLinkPopover: any

async function getExternalLinkPopover() {
	if (!ExternalLinkPopover) {
		const module = await import('~/components/util/ExternalLinkPopover.vue')
		ExternalLinkPopover = module.default || module
	}
	return ExternalLinkPopover
}

export function useExternalLink(options: ExternalLinkOptions = {}) {
	const appConfig = useAppConfig()
	const {
		whitelist = appConfig.component?.externalLink?.whitelist ?? defaultWhitelist,
		enabled = appConfig.component?.externalLink?.enabled ?? true,
		pageWhitelist = appConfig.component?.externalLink?.pageWhitelist ?? [],
		pageBlacklist = appConfig.component?.externalLink?.pageBlacklist ?? [],
	} = options

	const popoverStore = usePopoverStore()

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

	function isCurrentPageAllowed(): boolean {
		const router = useRouter()
		const currentPath = router.currentRoute.value.path

		const isInBlacklist = pageBlacklist.some((pattern) => {
			if (typeof pattern === 'string') {
				return currentPath === pattern
			}
			return pattern.test(currentPath)
		})

		if (isInBlacklist) {
			return false
		}

		if (pageWhitelist.length === 0) {
			return true
		}

		return pageWhitelist.some((pattern) => {
			if (typeof pattern === 'string') {
				return currentPath === pattern
			}
			return pattern.test(currentPath)
		})
	}

	function shouldShowDialog(url: string): boolean {
		return enabled && isCurrentPageAllowed() && isExternalLink(url) && !isInWhitelist(url)
	}

	async function handleExternalLink(url: string, target?: string, linkRect?: DOMRect) {
		if (!shouldShowDialog(url)) {
			window.open(url, target || '_blank', 'noopener,noreferrer')
			return
		}

		const ExternalLinkPopoverComp = await getExternalLinkPopover()
		const { open, close } = popoverStore.use(
			() =>
				h(ExternalLinkPopoverComp, {
					show: true,
					url,
					linkRect,
					onConfirm: () => {
						window.open(url, target || '_blank', 'noopener,noreferrer')
						close()
					},
					onCancel: () => close(),
				}),
			{ single: true },
		)
		open()
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

			if (shouldShowDialog(href)) {
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
