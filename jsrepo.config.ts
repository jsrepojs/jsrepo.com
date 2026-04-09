import { defineConfig } from "jsrepo";
import prettier from "@jsrepo/transform-prettier";

export default defineConfig({
	registries: [
		"@ieedan/std",
		"@ieedan/shadcn-svelte-extras"
	],
	paths: {
		ui: '$lib/components/ui',
		component: '$lib/components',
		hook: '$lib/hooks',
		action: '$lib/actions',
		util: '$lib/utils',
		lib: '$lib'
	},
	transforms: [prettier()],
});