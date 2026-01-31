# StudentsNet Owner Credentials

## Owner Login Details

**Contact/Username:** `owner@studentsnet`  
**Password:** `owner@2025`

## Owner Access & Permissions

The owner account has full administrative access to:

1. **Admin Panel** - Access via "Admin Panel" button on dashboard
2. **Payment Verification** - Approve/reject pending UPI payments
3. **User Management** - View all users and delete accounts
4. **Full System Access** - No payment required, bypasses all restrictions

## How to Access Owner Account

1. Go to login page: https://college-signup-1.preview.emergentagent.com/login
2. Enter credentials:
   - Contact: `owner@studentsnet`
   - Password: `owner@2025`
3. Click Login

## Admin Panel Features

### Pending Payments Tab
- View all pending payment verifications
- See payment screenshots
- See transaction IDs
- Approve payments (marks user as paid, grants dashboard access)
- Reject payments (resets user to unpaid status)

### All Users Tab
- View complete list of all registered students
- See user details (name, college, stream, contact, payment status)
- Delete users if needed

## Security Notes

⚠️ **IMPORTANT**: Change the default owner password after first login for security!

To change password, you would need to:
1. Update the password hash in the database directly
2. Or add a "Change Password" feature (not currently implemented)

## Owner Account Creation

The owner account is automatically created when the backend starts if it doesn't exist. This happens in the `startup_event` function in `/app/backend/server.py`.

---

**Live Application:** https://college-signup-1.preview.emergentagent.com
