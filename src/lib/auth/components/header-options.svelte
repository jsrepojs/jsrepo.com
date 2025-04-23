<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { authClient } from '../client';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { getInitials } from '$lib/ts/initials';
	import { signOut } from './utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	const session = authClient.useSession();
</script>

{#if $session.data}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Avatar.Root class="size-7 ring-2 ring-accent ring-offset-2 ring-offset-background">
				<Avatar.Image src={$session.data.user?.image} />
				<Avatar.Fallback>{getInitials($session.data.user.name)}</Avatar.Fallback>
			</Avatar.Root>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" sideOffset={6}>
			<DropdownMenu.Group>
				<DropdownMenu.Item onSelect={() => goto('/account')}>Account</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={() => goto('/account/scopes')}>Scopes</DropdownMenu.Item>
				<DropdownMenu.Item onSelect={signOut}>Log out</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{:else if !page.url.pathname.startsWith('/login')}
	<Button href="/login">Sign In</Button>
{/if}
