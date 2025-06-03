<script lang="ts">
	import { MetaTags } from '$lib/components/site/meta-tags';
	import RegistrySearch from '$lib/components/site/registry-search.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, Check } from '@lucide/svelte';
	import * as Icons from '$lib/components/icons';
	import { Marquee } from '$lib/components/animation/marquee';
	import * as AvatarGroup from '$lib/components/ui/avatar-group';

	const description =
		'The future of component registries. Distribute your source with incredible tooling at every step.';

	const members = [
		{
			username: 'user1',
			image:
				'https://images.freeimages.com/images/large-previews/fdd/man-avatar-1632964.jpg?fmt=webp&h=35'
		},
		{
			username: 'user2',
			image:
				'https://images.freeimages.com/images/large-previews/971/basic-shape-avatar-1632968.jpg?fmt=webp&h=350'
		},
		{
			username: 'user3',
			image:
				'https://images.freeimages.com/images/large-previews/d1f/lady-avatar-1632967.jpg?fmt=webp&h=350'
		}
	];
</script>

<MetaTags title="Home - jsrepo" {description} />

<div class="flex flex-col place-items-center pb-4">
	<div class="mt-[25svh] flex w-full max-w-4xl flex-col place-items-center gap-8">
		<div class="flex flex-col gap-4">
			<h1 class="text-center text-5xl font-bold md:text-6xl text-shadow-lg">
				The future of
				<br />
				Component Registries
			</h1>
			<p class="text-center text-lg text-muted-foreground">
				jsrepo.com is a faster, simpler, more maintainable solution for hosting your component
				registries.
			</p>
		</div>
		<RegistrySearch maxOptions={3} />
		<div class="flex place-items-center gap-4">
			<Button href="/account/new-registry">
				<span class="flex place-items-center">
					<ChevronRight class="inline" /> Start Shipping<span class="animate-caret-blink">_</span>
				</span>
			</Button>
		</div>
	</div>
	<div class="mb-20 mt-[25svh]">
		<div class="flex max-w-4xl flex-col gap-2">
			<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
				<div
					class="flex flex-col place-items-center gap-4 rounded-xl border border-border bg-card p-6 sm:col-start-1"
				>
					<div class="flex h-10 place-items-center">
						<code class="rounded-lg bg-black px-2 py-1 font-mono text-sm font-thin text-white">
							{'>'} <span class="text-primary">jsrepo</span> publish
						</code>
					</div>
					<div>
						<h2 class="text-center text-lg font-medium">First Class CLI Integration</h2>
						<p class="text-center text-muted-foreground">
							Publish, add, and update your code all from one place.
						</p>
					</div>
				</div>
				<div
					class="flex flex-col place-items-center gap-4 rounded-xl border border-border bg-card p-6 sm:col-span-2 sm:col-start-1 sm:row-start-2 lg:col-span-1 lg:col-start-2 lg:row-start-1"
				>
					<Icons.Semver class="size-10" />
					<div>
						<h2 class="text-center text-lg font-medium">Semantic Versioning</h2>
						<p class="text-center text-muted-foreground">
							Distribute your registries under immutable versions with the semver standard.
						</p>
					</div>
				</div>
				<div
					class="flex flex-col place-items-center gap-4 rounded-xl border border-border bg-card p-6 sm:col-start-2 lg:col-start-3"
				>
					<div class="flex h-10 place-items-center gap-2">
						<div>
							<span class="font-mono text-xs text-muted-foreground">Time:</span>
							<span class="font-mono text-xs text-green-400">150ms</span>
						</div>
						<div>
							<span class="font-mono text-xs text-muted-foreground">Size:</span>
							<span class="font-mono text-xs text-green-400">2.5 KB</span>
						</div>
					</div>
					<div>
						<h2 class="text-center text-lg font-medium">Build for Performance</h2>
						<p class="text-center text-muted-foreground">The fastest way to serve your registry.</p>
					</div>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
				<div class="relative rounded-xl border border-border bg-card p-6">
					<h2 class="text-lg font-medium">Framework Agnostic</h2>
					<p class="text-muted-foreground">Use what you use and let jsrepo.com do the rest.</p>
					<div class="h-16"></div>
					<div class="absolute bottom-8 left-0 w-full">
						<Marquee class="w-full [--duration:24s]" repeat={10}>
							<Icons.TypeScript class="mx-2 size-8" />
							<Icons.Svelte class="mx-2 size-8" />
							<Icons.React class="mx-2 size-8" />
							<Icons.Vue class="mx-2 size-8" />
							<Icons.CSS class="mx-2 size-8" />
							<Icons.HTML class="mx-2 size-8" />
							<Icons.JavaScript class="mx-2 size-8" />
							<Icons.SASS class="mx-2 size-8" />
							<Icons.Yaml class="mx-2 size-8" />
							<Icons.Svg class="mx-2 size-8" />
						</Marquee>
					</div>
				</div>
				<div class="rounded-xl border border-border bg-card p-6">
					<h2 class="text-lg font-medium">Work With Your Team</h2>
					<p class="text-muted-foreground">
						Publish and share code with your entire team with jsrepo.com organizations.
					</p>
					<AvatarGroup.Root class="pt-2">
						{#each members as member (member.username)}
							<AvatarGroup.Member class="size-8 ring-card">
								<AvatarGroup.MemberImage src={member.image} alt={member.username} />
								<AvatarGroup.MemberFallback>
									{member.username[0]}
								</AvatarGroup.MemberFallback>
							</AvatarGroup.Member>
						{/each}
						<AvatarGroup.Etc class="size-8 ring-card" plus={2} />
					</AvatarGroup.Root>
				</div>
			</div>
			<div
				class="relative flex place-items-start justify-between gap-4 overflow-hidden rounded-xl border border-border bg-card p-6 sm:min-h-64"
			>
				<div class="sm:pt-2">
					<h2 class="text-center text-lg font-medium sm:text-start">Monetize Your Registry</h2>
					<p class="text-center text-muted-foreground sm:max-w-[calc(75%)] sm:text-start">
						Publish and sell your registry on jsrepo.com with the jsrepo.com marketplace.
					</p>
					<div class="flex place-items-center justify-center gap-2 pt-2 sm:justify-normal">
						<Button href="/login" size="sm">
							Start Selling
							<ChevronRight />
						</Button>
						<Button href="https://jsrepo.dev/docs/jsrepo-com/marketplace" size="sm" variant="ghost">
							Learn More
						</Button>
					</div>
				</div>
				<div class="absolute left-3/4 top-6 hidden sm:block">
					<div class="w-72 rounded-xl border border-border bg-background p-2">
						<div class="relative flex w-80 flex-col justify-between gap-10 rounded-lg bg-card p-6">
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2">
									<span class="text-lg font-bold">Individual License</span>
									<div class="flex flex-col gap-2">
										<div class="flex place-items-start gap-1">
											<span class="text-5xl">
												${99.99}
											</span>
										</div>
										<div class="flex place-items-center gap-2">
											<div class="rounded-md bg-background px-1 py-0.5 text-sm">one time</div>
										</div>
									</div>
								</div>
								<div>
									{@render feature_list({
										features: ['Lifetime Access', 'Unlimited Downloads', '']
									})}
								</div>
								<div class="h-9"></div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div class="my-20 flex flex-col place-items-center gap-2">
		<h2 class="text-center text-2xl font-semibold">Ready to start shipping?</h2>
		<Button href="/login" size="sm">Let's Go!</Button>
	</div>
</div>

{#snippet feature_list({ features }: { features: string[] })}
	<ul class="mb-auto flex flex-col gap-2 text-sm text-muted-foreground">
		{#each features as feature (feature)}
			<li class="flex place-items-start gap-2 text-sm/[--line-height]" style="--line-height: 20px;">
				<span
					data-visible={feature.length > 0}
					class="flex h-[var(--line-height)] place-items-center justify-center opacity-0 data-[visible=true]:opacity-100"
				>
					<Check class="size-4 text-green-400" />
				</span>
				{feature}
			</li>
		{/each}
	</ul>
{/snippet}
