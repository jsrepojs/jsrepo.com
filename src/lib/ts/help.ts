export const SUPPORT_REASONS = {
	Feedback: {
		'feature-request': 'Request a feature'
	},
	Report: {
		'suspicious-registry': 'Report a Suspicious Registry',
		bug: 'Report a Bug'
	},
	Help: {
		technical: 'Technical Support',
		pricing: 'Question About Pricing'
	},
	Other: {
		other: 'Other'
	}
} as const;

export type SupportReason =
	| keyof (typeof SUPPORT_REASONS)['Feedback']
	| keyof (typeof SUPPORT_REASONS)['Report']
	| keyof (typeof SUPPORT_REASONS)['Help']
	| keyof (typeof SUPPORT_REASONS)['Other'];
