<?php
/**
 * Generate Default Avatar Images (Identicon Style)
 * Chess Game - Schach
 * 
 * Generates procedural avatar images based on username hash
 */

class AvatarGenerator {
    private $size = 200;
    private $gridSize = 5;
    private $colors = [
        [129, 182, 76],   // Green
        [118, 150, 86],   // Dark Green
        [181, 136, 99],   // Brown
        [52, 152, 219],   // Blue
        [155, 89, 182],   // Purple
        [241, 196, 15],   // Yellow
        [230, 126, 34],   // Orange
        [231, 76, 60],    // Red
        [26, 188, 156],   // Turquoise
        [149, 165, 166],  // Gray
    ];
    
    /**
     * Generate identicon based on username
     */
    public function generateIdenticon(string $username, string $outputPath): bool {
        // Create hash from username
        $hash = md5($username);
        
        // Select color based on hash
        $colorIndex = hexdec(substr($hash, 0, 2)) % count($this->colors);
        $color = $this->colors[$colorIndex];
        
        // Create image
        $image = imagecreatetruecolor($this->size, $this->size);
        
        // Set background (white)
        $bgColor = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $bgColor);
        
        // Set foreground color
        $fgColor = imagecolorallocate($image, $color[0], $color[1], $color[2]);
        
        // Calculate cell size
        $cellSize = $this->size / $this->gridSize;
        
        // Generate pattern from hash
        $hashBinary = '';
        for ($i = 0; $i < strlen($hash); $i += 2) {
            $byte = hexdec(substr($hash, $i, 2));
            $hashBinary .= str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
        }
        
        // Draw cells (mirror horizontally for symmetry)
        $index = 0;
        for ($y = 0; $y < $this->gridSize; $y++) {
            for ($x = 0; $x < ceil($this->gridSize / 2); $x++) {
                if ($index < strlen($hashBinary) && $hashBinary[$index] === '1') {
                    // Draw cell
                    $x1 = $x * $cellSize;
                    $y1 = $y * $cellSize;
                    $x2 = $x1 + $cellSize;
                    $y2 = $y1 + $cellSize;
                    imagefilledrectangle($image, (int)$x1, (int)$y1, (int)$x2, (int)$y2, $fgColor);
                    
                    // Mirror horizontally
                    if ($x < floor($this->gridSize / 2)) {
                        $mirrorX = $this->gridSize - 1 - $x;
                        $x1 = $mirrorX * $cellSize;
                        $x2 = $x1 + $cellSize;
                        imagefilledrectangle($image, (int)$x1, (int)$y1, (int)$x2, (int)$y2, $fgColor);
                    }
                }
                $index++;
            }
        }
        
        // Save image
        $success = imagepng($image, $outputPath);
        imagedestroy($image);
        
        return $success;
    }
    
    /**
     * Generate chess-themed avatar
     */
    public function generateChessPiece(string $piece, string $outputPath): bool {
        $image = imagecreatetruecolor($this->size, $this->size);
        
        // Set background (transparent)
        $bgColor = imagecolorallocate($image, 255, 255, 255);
        imagefill($image, 0, 0, $bgColor);
        
        // Set piece color
        $pieceColor = imagecolorallocate($image, 118, 150, 86);
        
        // Draw simple chess piece (this is a basic representation)
        // For production, you'd want to use actual chess piece SVGs or fonts
        $fontSize = 120;
        $font = null; // Would need a font file for better rendering
        
        // Map pieces to Unicode chess symbols
        $symbols = [
            'king' => '♔',
            'queen' => '♕',
            'rook' => '♖',
            'bishop' => '♗',
            'knight' => '♘',
            'pawn' => '♙'
        ];
        
        $symbol = $symbols[$piece] ?? '♙';
        
        // For now, just create a colored circle as fallback
        $centerX = $this->size / 2;
        $centerY = $this->size / 2;
        $radius = $this->size / 2 - 10;
        
        imagefilledellipse($image, (int)$centerX, (int)$centerY, (int)($radius * 2), (int)($radius * 2), $pieceColor);
        
        // Save image
        $success = imagepng($image, $outputPath);
        imagedestroy($image);
        
        return $success;
    }
}

// Generate default avatars if run directly
if (php_sapi_name() === 'cli') {
    $generator = new AvatarGenerator();
    $defaultDir = __DIR__ . '/../uploads/avatars/default';
    
    if (!is_dir($defaultDir)) {
        mkdir($defaultDir, 0755, true);
    }
    
    // Generate chess piece avatars
    $pieces = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
    foreach ($pieces as $piece) {
        $outputPath = "$defaultDir/$piece.png";
        if ($generator->generateChessPiece($piece, $outputPath)) {
            echo "Generated default avatar: $piece.png\n";
        }
    }
    
    // Generate some sample identicons
    $samples = ['player1', 'player2', 'player3', 'player4', 'player5'];
    foreach ($samples as $username) {
        $outputPath = "$defaultDir/identicon_$username.png";
        if ($generator->generateIdenticon($username, $outputPath)) {
            echo "Generated identicon: identicon_$username.png\n";
        }
    }
    
    echo "Default avatars generated successfully!\n";
}

// Export for use in other scripts
function avatarGenerator(): AvatarGenerator {
    static $instance = null;
    if ($instance === null) {
        $instance = new AvatarGenerator();
    }
    return $instance;
}
