import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const orgMemberRole = v.union(v.literal('member'), v.literal('publisher'), v.literal('owner'));

export const registryAccess = v.union(v.literal('public'), v.literal('private'), v.literal('marketplace'));

export default defineSchema({
    ownerIdentifier: defineTable({
        name: v.string(),
    }).index('name', ['name']),
    org: defineTable({
        name: v.string(),
        description: v.string(),
        memberCount: v.number(),
    }).index('name', ['name']),
    orgMember: defineTable({
        orgId: v.id('org'),
        userId: v.id('user'),
        role: orgMemberRole,
    }).index('org_and_user', ['orgId', 'userId']).index('role', ['role']),
    orgInvite: defineTable({
        orgId: v.id('org'),
        userId: v.id('user'),
        role: orgMemberRole,
        acceptedAt: v.optional(v.number()),
        rejectedAt: v.optional(v.number()),
    }).index('org_and_user', ['orgId', 'userId']).index('role', ['role']),
    scope: defineTable({
        name: v.string(),
        orgId: v.optional(v.id('org')),
        userId: v.optional(v.id('user')),
        claimedAt: v.number(),
    }).index('name', ['name']).index('org_and_user', ['orgId', 'userId']),
    scopeTransferRequest: defineTable({
        scopeId: v.id('scope'),
        newOrgId: v.optional(v.id('org')),
        newUserId: v.optional(v.id('user')),
        oldOrgId: v.optional(v.id('org')),
        oldUserId: v.optional(v.id('user')),
        createdById: v.id('user'),
        acceptedAt: v.optional(v.number()),
        rejectedAt: v.optional(v.number()),
    }).index('scope_and_new_owner', ['scopeId', 'newOrgId', 'newUserId']).index('scope_and_old_owner', ['scopeId', 'oldOrgId', 'oldUserId']).index('created_by', ['createdById']),
    registry: defineTable({
        name: v.string(),
        scopeId: v.id('scope'),
        access: registryAccess,
        metaAuthors: v.array(v.string()),
        metaBugs: v.optional(v.string()),
        metaDescription: v.optional(v.string()),
        metaHomepage: v.optional(v.string()),
        metaRepository: v.optional(v.string()),
        metaTags: v.array(v.string()),
        metaPrimaryLanguage: v.string(),

        listOnMarketplace: v.boolean(),
        rating: v.optional(v.number()),
    }).index('name', ['name']).index('scope_and_access', ['scopeId', 'access']),
    version: defineTable({
        registryId: v.id('registry'),
        version: v.string(),
        tag: v.optional(v.string()),
        releasedById: v.id('user'),
        hasReadme: v.boolean(),
        tarball: v.string(),
    }).index('registry_and_version', ['registryId', 'version']).index('registry_and_tag', ['registryId', 'tag']),
    commonNameBan: defineTable({
        name: v.string(),
    }).index('name', ['name']),
    dailyRegistryFetch: defineTable({
        scopeId: v.id('scope'),
        registryId: v.id('registry'),
        versionId: v.id('version'),
        fileName: v.string(),
        count: v.number(),
        day: v.number(),
    }).index('scope_and_registry_and_version', ['scopeId', 'registryId', 'versionId']).index('day', ['day']),
}); 