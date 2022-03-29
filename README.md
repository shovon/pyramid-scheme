# Using WebRTC to promote a pyramid scheme

Let's see if this even works.

## Auth Logic

- Hit server to get JWT, that will contain a MAC'd 6-digit code, and the email address
- Send an email out with the 6-digit code or give out a link
- This will result in the creation of a token that will expire in 1 minute

The logic is that once the user logs into the site, they should be using only a single tab to broadcast; not more than that

Of course, this is not ideal, but for this first release, we just want the users to actually just use the product, and nothing more.
