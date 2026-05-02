# Seed Data Login Credentials

This file documents the manual test accounts seeded into the backend database.

## Common Passwords

- Individuals: `User123!`
- Organizations: `Org123!`
- Admins: `Admin123!`

## Individual Accounts (4)

1. Username: `individual.alice`  
   Email: `individual.alice@apptivity.local`  
   Phone: `+905010000001`
2. Username: `individual.berk`  
   Email: `individual.berk@apptivity.local`  
   Phone: `+905010000002`
3. Username: `individual.cem`  
   Email: `individual.cem@apptivity.local`  
   Phone: `+905010000003`
4. Username: `individual.derya`  
   Email: `individual.derya@apptivity.local`  
   Phone: `+905010000004`

## Organization Accounts (2)

1. Username: `organization.apptivity.club`  
   Email: `organization.one@apptivity.local`  
   Phone: `+905010000005`
2. Username: `organization.city.events`  
   Email: `organization.two@apptivity.local`  
   Phone: `+905010000006`

## Admin Accounts (2)

1. Username: `admin.supervisor`  
   Email: `admin.one@apptivity.local`  
   Phone: `+905010000007`
2. Username: `admin.operator`  
   Email: `admin.two@apptivity.local`  
   Phone: `+905010000008`

## Notes

- Role claims are seeded by `Account.Type`.
- All accounts are active (`IsActive = true`) and not deleted.
- Organization profiles are created as `Club` records with shared primary key.
