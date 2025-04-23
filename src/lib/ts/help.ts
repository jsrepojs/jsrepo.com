export const SUPPORT_REASONS = {
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
};

export type SupportReason =
	| keyof (typeof SUPPORT_REASONS)['Report']
	| keyof (typeof SUPPORT_REASONS)['Help']
	| keyof (typeof SUPPORT_REASONS)['Other'];
