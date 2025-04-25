<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { authClient } from '../client';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { page } from '$app/state';

	const session = authClient.useSession();
</script>

{#if $session.data}
	<a href="/account">
		<Avatar.Root class="size-8 ring-offset-background">
			<Avatar.Image src={$session.data.user?.image} />
			<Avatar.Fallback>{getInitials($session.data.user.name)}</Avatar.Fallback>
		</Avatar.Root>
	</a>

	<!-- maybe we will bring it back idk -->
	<!-- <DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Avatar.Root class="size-7 ring-2 ring-accent ring-offset-2 ring-offset-background">
				<Avatar.Image src={$session.data.user?.image} />
				<Avatar.Fallback>{getInitials($session.data.user.name)}</Avatar.Fallback>
			</Avatar.Root>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" sideOffset={6}>
			<DropdownMenu.Group>
				<DropdownMenu.Item onSelect={() => goto('/account')}>
					<User />
					Account
				</DropdownMenu.Item>
			</DropdownMenu.Group>
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				<DropdownMenu.Item onSelect={() => goto('/account/scopes')}>
					<Telescope />
					Scopes
				</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => goto('/account/organizations')}>
					<Building />
					Organizations
				</DropdownMenu.Item>
			</DropdownMenu.Group>
			<DropdownMenu.Separator />
			<DropdownMenu.Group>
				<DropdownMenu.Item onSelect={signOut}>
					<LogOut />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root> -->
{:else if !page.url.pathname.startsWith('/login')}
	<Button href="/login">Sign In</Button>
{/if}
