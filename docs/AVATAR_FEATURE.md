# Avatar Upload Feature

## Overview
The avatar upload feature allows users to personalize their profile with custom avatars. Users can upload their own images, generate unique identicons, or choose from default chess-themed avatars.

## Features

### 1. Custom Avatar Upload
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Maximum file size**: 5MB
- **Automatic optimization**: Images are automatically resized to 400x400px and optimized for web
- **Location**: Uploaded avatars are stored in `uploads/avatars/users/`

### 2. Procedural Identicons
- **Unique patterns**: Each user can generate a unique identicon based on their username
- **Algorithm**: Uses MD5 hash of username to create a symmetric 5x5 grid pattern
- **Colors**: 10 different color schemes available
- **Location**: Generated identicons are saved to `uploads/avatars/users/`

### 3. Default Avatars
- **Chess pieces**: 6 chess-themed default avatars (King, Queen, Rook, Bishop, Knight, Pawn)
- **Sample identicons**: 5 pre-generated identicon patterns
- **Location**: `uploads/avatars/default/`

## User Interface

### Profile Page
1. Navigate to profile page (profile.html)
2. Click "Edit Profile" button
3. In the edit modal, you'll see:
   - Current avatar preview (120x120px circle)
   - "Change Avatar" button
   - Avatar options panel with:
     - Upload custom avatar button
     - Generate unique pattern button
     - Grid of default avatars to choose from
     - Remove avatar button

### Avatar Display Locations
Avatars are displayed in multiple locations:
1. **Header** (top-right): 36x36px circle with user info
2. **Profile Page** (large): 120x120px circle with user details
3. **In-Game Player Info**: 48x48px circle next to player name and ELO rating

## Technical Implementation

### Backend (PHP)

#### Files
- `php/avatar.php`: Main avatar management endpoint
  - `GET`: List default avatars
  - `POST`: Upload custom avatar
  - `PUT`: Select default avatar, generate identicon, or delete avatar
  
- `php/generate-default-avatars.php`: Avatar generation utilities
  - `AvatarGenerator` class with methods:
    - `generateIdenticon()`: Creates identicon from username
    - `generateChessPiece()`: Creates simple chess piece avatar
  - CLI script to generate default avatars

#### Database
The `users` table already has an `avatar` column:
```sql
avatar VARCHAR(255) DEFAULT NULL
```

This stores the relative path to the avatar image (e.g., `uploads/avatars/users/user_123_1234567890.png`)

#### Auth Updates
The `Auth::updateProfile()` method in `includes/auth.php` handles avatar updates:
```php
if (isset($data['avatar'])) {
    $updates[] = "avatar = ?";
    $params[] = $data['avatar'];
}
```

### Frontend (JavaScript)

#### Files
- `js/profile-page.js`: Avatar management functions
  - `setupAvatarListeners()`: Sets up event handlers
  - `loadDefaultAvatars()`: Fetches and displays default avatars
  - `handleAvatarUpload()`: Handles file upload with validation
  - `handleGenerateIdenticon()`: Triggers identicon generation
  - `handleSelectDefaultAvatar()`: Selects a default avatar
  - `handleDeleteAvatar()`: Removes current avatar
  - `updateAvatarDisplay()`: Updates avatar in all UI locations

- `js/main.js`: Updated `updateUIForLoggedInUser()` to display avatars in header and game

#### HTML Updates
- `profile.html`: Added avatar upload UI in edit profile modal
- `index.html`: Already had avatar placeholders in header and player info

### Styling (CSS)

#### Files
- `css/auth.css`: Added avatar-specific styles
  - `.avatar-section`: Main container for avatar management
  - `.avatar-preview`: Large circular preview (120x120px)
  - `.avatar-options`: Expandable options panel
  - `.default-avatars-grid`: Grid layout for default avatar selection
  - `.user-avatar`, `.profile-avatar-large`, `.player-avatar`: Avatar displays at different sizes
  - Support for `<img>` elements within avatar containers

## Security Considerations

### File Upload Security
1. **MIME type validation**: Only allows image/jpeg, image/png, image/gif, image/webp
2. **File size limit**: Maximum 5MB to prevent abuse
3. **File extension validation**: Checks actual file type using `mime_content_type()`
4. **Unique filenames**: Uses `user_{id}_{timestamp}.{ext}` pattern to prevent conflicts
5. **Old file cleanup**: Automatically deletes previous user-uploaded avatars

### Path Security
- All file paths are validated
- Default avatars are served from a restricted directory
- User uploads are in a separate directory (`uploads/avatars/users/`)
- The `.gitignore` prevents user-uploaded avatars from being committed to version control

## Usage Example

### Generate Default Avatars (CLI)
```bash
php php/generate-default-avatars.php
```

### Upload Avatar (JavaScript)
```javascript
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('php/avatar.php', {
    method: 'POST',
    body: formData
});

const result = await response.json();
if (result.success) {
    console.log('Avatar uploaded:', result.avatar);
}
```

### Select Default Avatar (JavaScript)
```javascript
const response = await fetch('php/avatar.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'select',
        avatar: 'uploads/avatars/default/king.png'
    })
});
```

### Generate Identicon (JavaScript)
```javascript
const response = await fetch('php/avatar.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'select',
        avatar: 'identicon'
    })
});
```

## Future Enhancements

Potential improvements for the avatar system:
1. **Avatar cropping**: Add client-side image cropping before upload
2. **More default avatars**: Add more chess-themed or abstract avatars
3. **Avatar frames**: Allow users to add decorative frames to their avatars
4. **Achievement badges**: Display achievement badges on avatars
5. **Animated avatars**: Support for animated GIFs or WebP
6. **Social login avatars**: Import avatars from social media accounts
7. **Avatar history**: Keep a history of previous avatars
8. **Moderation**: Admin tools to moderate inappropriate avatars

## Troubleshooting

### Upload fails with "File too large"
- Ensure the file is under 5MB
- Check PHP upload limits in `php.ini`: `upload_max_filesize` and `post_max_size`

### Avatar doesn't display
- Check file permissions on `uploads/` directory (should be 755)
- Verify the avatar path is correct in the database
- Check browser console for 404 errors

### Identicon not generating
- Ensure GD library is installed and enabled in PHP
- Check write permissions on `uploads/avatars/users/` directory

### Default avatars not loading
- Verify default avatars exist in `uploads/avatars/default/`
- Run `php php/generate-default-avatars.php` to regenerate

## Testing

To test the avatar feature:
1. Register or login to the application
2. Navigate to profile page
3. Click "Edit Profile"
4. Try each avatar option:
   - Upload a custom image (test various formats and sizes)
   - Generate an identicon
   - Select default avatars
   - Remove avatar
5. Verify avatar displays correctly in:
   - Profile page
   - Header
   - Game player info
6. Test edge cases:
   - Very large files (should be rejected)
   - Invalid file types (should be rejected)
   - Multiple rapid uploads
