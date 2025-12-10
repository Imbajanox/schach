# Schach - Chess Game

A full-featured web-based chess game built with HTML, CSS, JavaScript, and PHP with MySQL database backend.

## Features

### Core Gameplay
- ✅ Complete chess rules implementation
- ✅ Drag-and-drop piece movement
- ✅ Move validation and highlighting
- ✅ Check, checkmate, and stalemate detection
- ✅ Special moves: castling, en passant, pawn promotion
- ✅ Game state management (undo/redo, draw conditions)

### AI Opponent
- ✅ Three difficulty levels (Easy, Medium, Hard)
- ✅ Minimax algorithm with alpha-beta pruning
- ✅ Position evaluation
- ✅ Opening book integration

### User Account System
- ✅ User registration and authentication
- ✅ **Email verification system** (new!)
- ✅ Session management
- ✅ User profiles and statistics
- ✅ Password security (bcrypt hashing)

### Email System
- ✅ Email verification for new accounts
- ✅ Welcome emails after verification
- ✅ Resend verification functionality
- ✅ Development mode (log emails to file)
- ✅ Production SMTP support (Netcup/Plesk compatible)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | PHP 8.x |
| Database | MySQL 8.x |
| Server | Apache (WAMP64 for local, Plesk for production) |

## Installation

### Prerequisites
- **WAMP64** (Windows) or LAMP (Linux) stack
- PHP 8.0 or higher
- MySQL 8.0 or higher
- Apache web server

### Local Setup (WAMP64)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Imbajanox/schach.git
   cd schach
   ```

2. **Set up the database**
   - Open phpMyAdmin (http://localhost/phpmyadmin)
   - Import the schema: `sql/schema.sql`
   - Or create database manually and run the SQL file

3. **Configure the application**
   - Edit `includes/config.php`
   - Update database credentials if needed:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'schach');
     define('DB_USER', 'root');
     define('DB_PASS', ''); // Default WAMP password is empty
     ```

4. **Configure email settings (for development)**
   ```php
   // Email will be logged to logs/emails.log instead of being sent
   define('EMAIL_ENABLED', true);
   define('EMAIL_DEV_MODE', true);
   
   // Optional: Skip email verification entirely for local development
   define('EMAIL_VERIFICATION_REQUIRED', false);
   ```

5. **Access the application**
   - Open your browser
   - Navigate to: `http://localhost/schach`

### Production Setup (Netcup/Plesk)

1. **Upload files to your web server**
   - Upload all files to your web root directory
   - Ensure proper file permissions

2. **Create database**
   - Use Plesk or phpMyAdmin to create the database
   - Import `sql/schema.sql`

3. **Configure the application**
   - Edit `includes/config.php`:
     ```php
     define('SITE_URL', 'https://yourdomain.com');
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'your_database_name');
     define('DB_USER', 'your_database_user');
     define('DB_PASS', 'your_database_password');
     ```

4. **Configure email (SMTP)**
   - See detailed guide: [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)
   - Update SMTP settings in `includes/config.php`:
     ```php
     define('EMAIL_DEV_MODE', false);
     define('EMAIL_USE_SMTP', true);
     define('EMAIL_SMTP_HOST', 'mail.yourdomain.com');
     define('EMAIL_SMTP_PORT', 587);
     define('EMAIL_SMTP_USER', 'noreply@yourdomain.com');
     define('EMAIL_SMTP_PASS', 'your_password');
     ```

## Email Verification System

The application now includes a complete email verification system:

### Features
- New users receive a verification email upon registration
- Verification tokens expire after 24 hours
- Users can resend verification emails
- Welcome email sent after successful verification
- Flexible configuration for development and production

### Configuration Options

```php
// Enable/disable email functionality
define('EMAIL_ENABLED', true);

// Development mode (logs emails instead of sending)
define('EMAIL_DEV_MODE', true);  // false in production

// Require email verification for login
define('EMAIL_VERIFICATION_REQUIRED', true);

// Token expiry time (in seconds)
define('EMAIL_VERIFICATION_EXPIRY', 86400); // 24 hours
```

### For Local Development
- Set `EMAIL_DEV_MODE` to `true`
- Emails are logged to `logs/emails.log`
- Check the log file for verification links
- Or disable verification: `EMAIL_VERIFICATION_REQUIRED = false`

### For Production
- Set `EMAIL_DEV_MODE` to `false`
- Configure SMTP settings
- See full guide: [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)

## Database Schema

The application uses the following tables:
- `users` - User accounts (with email verification fields)
- `user_stats` - Player statistics
- `games` - Game records
- `moves` - Move history
- `sessions` - Persistent login sessions

### Upgrading Existing Database

If upgrading from a version without email verification, run:

```sql
-- From sql/migrations/001_add_verification_token_expires.sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verification_token_expires DATETIME DEFAULT NULL 
AFTER verification_token;

ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_verification_token (verification_token);
```

## Project Structure

```
schach/
├── css/              # Stylesheets
├── js/               # JavaScript modules
│   ├── ai.js         # AI opponent logic
│   ├── auth.js       # Authentication
│   ├── board.js      # Board rendering
│   ├── game.js       # Game state management
│   └── ...
├── php/              # Backend endpoints
│   ├── auth/         # Authentication endpoints
│   │   ├── register.php
│   │   ├── login.php
│   │   ├── verify-email.php
│   │   └── resend-verification.php
│   └── game/         # Game endpoints
├── includes/         # Backend core files
│   ├── config.php    # Configuration
│   ├── database.php  # Database singleton
│   ├── auth.php      # Auth class
│   ├── email.php     # Email service (new!)
│   └── game.php      # Game logic
├── sql/              # Database files
│   ├── schema.sql    # Main schema
│   └── migrations/   # Database migrations
├── templates/        # Email templates
│   └── email/
│       ├── verification.html
│       └── welcome.html
├── docs/             # Documentation
│   └── EMAIL_SETUP.md # Email setup guide
├── index.html        # Main page
└── verify-email.html # Email verification page
```

## API Endpoints

### Authentication
- `POST /php/auth/register.php` - Register new user
- `POST /php/auth/login.php` - Login user
- `POST /php/auth/logout.php` - Logout user
- `GET /php/auth/session.php` - Check session
- `GET /php/auth/verify-email.php?token=xxx` - Verify email
- `POST /php/auth/resend-verification.php` - Resend verification email

### Game
- `POST /php/game/save.php` - Save game
- `GET /php/game/load.php` - Load game
- `GET /php/game/history.php` - Get game history

## Usage

1. **Register an account**
   - Click "Register" on the home page
   - Fill in username, email, and password
   - Check your email (or logs in dev mode) for verification link

2. **Verify your email**
   - Click the verification link in the email
   - Or check `logs/emails.log` and copy the link

3. **Login**
   - Use your username or email and password
   - Choose "Remember Me" for persistent login

4. **Play chess**
   - Select difficulty (Easy, Medium, Hard)
   - Choose your color (White or Black)
   - Click "New Game" to start

5. **Make moves**
   - Drag and drop pieces
   - Valid moves are highlighted
   - Special moves (castling, en passant) are handled automatically

## Development

### Code Conventions
- See [repository custom instructions](.github/copilot-instructions.md)
- Use PHP 8+ features
- Follow PSR-12 coding style for PHP
- Use ES6+ JavaScript features
- No external frameworks - vanilla JS only

### Email Templates
Email templates are in `templates/email/`:
- `verification.html` - Email verification message
- `welcome.html` - Welcome message after verification

Templates use `{{variable}}` syntax for placeholders:
- `{{username}}` - User's username
- `{{verification_url}}` - Verification link
- `{{site_name}}` - Site name
- `{{site_url}}` - Site URL

## Roadmap

See [roadmap.md](roadmap.md) for detailed development plans.

### Current Status
- ✅ v0.1 - Chessboard + Basic piece movement
- ✅ v0.5 - Complete chess rules + Local play
- 🟡 v1.0 - Account system + Basic AI (in progress)
  - ✅ User registration and authentication
  - ✅ Email verification system
  - ✅ AI opponent with multiple difficulties
  - 🔲 Password reset via email (planned)
  - 🔲 Profile customization (planned)

## Troubleshooting

### Email Issues
See detailed troubleshooting in [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md)

### Common Issues

**Database connection failed**
- Check credentials in `includes/config.php`
- Ensure MySQL service is running
- Verify database exists

**Session errors**
- Clear browser cookies
- Check PHP session configuration
- Ensure `/tmp` or session directory is writable

**Email not received (production)**
- Check SMTP credentials
- Verify email account exists
- Check spam folder
- Review server logs

## Security

- ✅ Password hashing with bcrypt (cost 12)
- ✅ Prepared statements (SQL injection prevention)
- ✅ Input validation and sanitization
- ✅ Session management
- ✅ Email verification with expiring tokens
- ✅ CSRF protection (via session tokens)
- ⚠️ Enable HTTPS in production
- ⚠️ Set `DEBUG_MODE = false` in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Credits

Developed by [Imbajanox](https://github.com/Imbajanox)

## Support

For issues or questions:
- Open an issue on GitHub
- Check the documentation in `docs/`
- Review the roadmap for planned features

---

*Last updated: December 2024*
