<?php
/**
 * Avatar Management Endpoint
 * POST: Upload avatar
 * PUT: Select default avatar or delete avatar
 * GET: List default avatars
 * Chess Game - Schach
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../includes/config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/generate-default-avatars.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetAvatars();
        break;
    case 'POST':
        handleUploadAvatar();
        break;
    case 'PUT':
        handleUpdateAvatar();
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Method not allowed']]);
}

/**
 * Get list of default avatars
 */
function handleGetAvatars(): void {
    $defaultDir = __DIR__ . '/../uploads/avatars/default';
    $avatars = [];
    
    if (is_dir($defaultDir)) {
        $files = scandir($defaultDir);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..' && preg_match('/\.(png|jpg|jpeg)$/i', $file)) {
                $avatars[] = [
                    'name' => pathinfo($file, PATHINFO_FILENAME),
                    'path' => 'uploads/avatars/default/' . $file
                ];
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'avatars' => $avatars
    ]);
}

/**
 * Upload custom avatar
 */
function handleUploadAvatar(): void {
    if (!auth()->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
        return;
    }
    
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['avatar' => 'No file uploaded or upload error']]);
        return;
    }
    
    $file = $_FILES['avatar'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $fileType = mime_content_type($file['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['avatar' => 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.']]);
        return;
    }
    
    // Validate file size (max 5MB)
    $maxSize = 5 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['avatar' => 'File too large. Maximum size is 5MB.']]);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    
    // Create user avatar directory if it doesn't exist
    $uploadDir = __DIR__ . '/../uploads/avatars/users';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'user_' . $userId . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . '/' . $filename;
    
    // Delete old avatar if exists
    $currentUser = auth()->getCurrentUser();
    if ($currentUser && $currentUser['avatar']) {
        $oldAvatar = __DIR__ . '/../' . $currentUser['avatar'];
        // Only delete if it's a user-uploaded avatar (not a default one)
        if (strpos($currentUser['avatar'], 'uploads/avatars/users/') !== false && file_exists($oldAvatar)) {
            unlink($oldAvatar);
        }
    }
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Failed to save avatar']]);
        return;
    }
    
    // Resize and optimize image
    $optimizedPath = optimizeImage($filepath, $extension);
    if ($optimizedPath && $optimizedPath !== $filepath) {
        unlink($filepath);
        $filepath = $optimizedPath;
        $filename = basename($filepath);
    }
    
    // Update database
    $avatarPath = 'uploads/avatars/users/' . $filename;
    $result = auth()->updateProfile($userId, ['avatar' => $avatarPath]);
    
    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'avatar' => $avatarPath,
            'message' => 'Avatar uploaded successfully'
        ]);
    } else {
        // Clean up uploaded file if database update fails
        if (file_exists($filepath)) {
            unlink($filepath);
        }
        http_response_code(500);
        echo json_encode($result);
    }
}

/**
 * Update avatar (select default or delete)
 */
function handleUpdateAvatar(): void {
    if (!auth()->isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
        return;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid request data']]);
        return;
    }
    
    $userId = $_SESSION['user_id'];
    $action = $input['action'] ?? null;
    
    // Delete avatar
    if ($action === 'delete') {
        $currentUser = auth()->getCurrentUser();
        if ($currentUser && $currentUser['avatar']) {
            $avatarPath = __DIR__ . '/../' . $currentUser['avatar'];
            // Only delete if it's a user-uploaded avatar
            if (strpos($currentUser['avatar'], 'uploads/avatars/users/') !== false && file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }
        
        $result = auth()->updateProfile($userId, ['avatar' => null]);
        
        if ($result['success']) {
            echo json_encode([
                'success' => true,
                'message' => 'Avatar removed successfully'
            ]);
        } else {
            http_response_code(500);
            echo json_encode($result);
        }
        return;
    }
    
    // Select default avatar or generate identicon
    if ($action === 'select' && isset($input['avatar'])) {
        $avatar = $input['avatar'];
        
        // Check if it's a default avatar
        if ($avatar === 'identicon') {
            // Generate identicon for user
            $currentUser = auth()->getCurrentUser();
            if (!$currentUser) {
                http_response_code(401);
                echo json_encode(['success' => false, 'errors' => ['general' => 'Not logged in']]);
                return;
            }
            
            $generator = avatarGenerator();
            $uploadDir = __DIR__ . '/../uploads/avatars/users';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $filename = 'identicon_' . $userId . '_' . time() . '.png';
            $filepath = $uploadDir . '/' . $filename;
            
            if ($generator->generateIdenticon($currentUser['username'], $filepath)) {
                // Delete old avatar if exists
                if ($currentUser['avatar']) {
                    $oldAvatar = __DIR__ . '/../' . $currentUser['avatar'];
                    if (strpos($currentUser['avatar'], 'uploads/avatars/users/') !== false && file_exists($oldAvatar)) {
                        unlink($oldAvatar);
                    }
                }
                
                $avatarPath = 'uploads/avatars/users/' . $filename;
                $result = auth()->updateProfile($userId, ['avatar' => $avatarPath]);
                
                if ($result['success']) {
                    echo json_encode([
                        'success' => true,
                        'avatar' => $avatarPath,
                        'message' => 'Identicon generated successfully'
                    ]);
                } else {
                    if (file_exists($filepath)) {
                        unlink($filepath);
                    }
                    http_response_code(500);
                    echo json_encode($result);
                }
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'errors' => ['general' => 'Failed to generate identicon']]);
            }
        } else {
            // Use default avatar
            $defaultPath = 'uploads/avatars/default/' . basename($avatar);
            $fullPath = __DIR__ . '/../' . $defaultPath;
            
            if (!file_exists($fullPath)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'errors' => ['avatar' => 'Invalid avatar selection']]);
                return;
            }
            
            // Delete old custom avatar if exists
            $currentUser = auth()->getCurrentUser();
            if ($currentUser && $currentUser['avatar']) {
                $oldAvatar = __DIR__ . '/../' . $currentUser['avatar'];
                if (strpos($currentUser['avatar'], 'uploads/avatars/users/') !== false && file_exists($oldAvatar)) {
                    unlink($oldAvatar);
                }
            }
            
            $result = auth()->updateProfile($userId, ['avatar' => $defaultPath]);
            
            if ($result['success']) {
                echo json_encode([
                    'success' => true,
                    'avatar' => $defaultPath,
                    'message' => 'Avatar updated successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode($result);
            }
        }
        return;
    }
    
    http_response_code(400);
    echo json_encode(['success' => false, 'errors' => ['general' => 'Invalid action']]);
}

/**
 * Optimize and resize image
 */
function optimizeImage(string $filepath, string $extension): ?string {
    $maxWidth = 400;
    $maxHeight = 400;
    $quality = 85;
    
    // Load image based on type
    $image = null;
    switch (strtolower($extension)) {
        case 'jpg':
        case 'jpeg':
            $image = @imagecreatefromjpeg($filepath);
            break;
        case 'png':
            $image = @imagecreatefrompng($filepath);
            break;
        case 'gif':
            $image = @imagecreatefromgif($filepath);
            break;
        case 'webp':
            $image = @imagecreatefromwebp($filepath);
            break;
    }
    
    if (!$image) {
        return null;
    }
    
    $width = imagesx($image);
    $height = imagesy($image);
    
    // Calculate new dimensions
    if ($width > $maxWidth || $height > $maxHeight) {
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = (int)($width * $ratio);
        $newHeight = (int)($height * $ratio);
        
        // Create new image
        $newImage = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG and GIF
        if (strtolower($extension) === 'png' || strtolower($extension) === 'gif') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            $transparent = imagecolorallocatealpha($newImage, 0, 0, 0, 127);
            imagefill($newImage, 0, 0, $transparent);
        }
        
        // Resize
        imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Save optimized image
        $newPath = pathinfo($filepath, PATHINFO_DIRNAME) . '/' . 
                   pathinfo($filepath, PATHINFO_FILENAME) . '_optimized.' . $extension;
        
        $success = false;
        switch (strtolower($extension)) {
            case 'jpg':
            case 'jpeg':
                $success = imagejpeg($newImage, $newPath, $quality);
                break;
            case 'png':
                $success = imagepng($newImage, $newPath, 9);
                break;
            case 'gif':
                $success = imagegif($newImage, $newPath);
                break;
            case 'webp':
                $success = imagewebp($newImage, $newPath, $quality);
                break;
        }
        
        imagedestroy($image);
        imagedestroy($newImage);
        
        return $success ? $newPath : null;
    }
    
    imagedestroy($image);
    return $filepath;
}
