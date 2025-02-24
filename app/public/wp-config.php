<?php
/**
 * The base configuration for WordPress
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * Localized language
 * * ABSPATH
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'local' );

/** Database username */
define( 'DB_USER', 'root' );

/** Database password */
define( 'DB_PASSWORD', 'root' );

/** Database hostname */
define( 'DB_HOST', 'localhost' );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 */
define( 'AUTH_KEY',          'o$xF_tpe=Zi3 YlHrh2u=H{X_%t i1&b,#$jFHT7(h0XcI&u28WIB>w(5^JEgz1`' );
define( 'SECURE_AUTH_KEY',   '&yH_zb~RGe1a$k,y1#zOc|p>rv-Z^A2N{WW2:zDQ6,(8_WI+n?l2p5a,(Ci_dj=Z' );
define( 'LOGGED_IN_KEY',     'Arg&sJ3d-_)UX~&:!{{9*jINX%G73x59Y*Dr>nJS,>7iNU#kV;<-udi<lUa_n|+,' );
define( 'NONCE_KEY',         'cAC2eC0+XT@[qRAG~eXMXXcr4)}hrRY; }i>(@s~aod4(/JWB{o*}`pHwx<~nFth' );
define( 'AUTH_SALT',         '19l:xyo8gR( c{WmcQ={XRbfV#J^#%r|l>,##KK2]13 V?IscgdX_?EQ&$<dI8n5' );
define( 'SECURE_AUTH_SALT',  'vnoh7^wla/aMhZs!AM7[]!^wSb-07~#e!u$Z3l&Uw,Mdr+4,2`]^hI3~=_cDwLqG' );
define( 'LOGGED_IN_SALT',    '[_I7e OG@@p_5g0DQE)6|Vn23_#15k4ll/DMO~;XZ;VrX}Lx@Mvdn/4z}K>5]x</' );
define( 'NONCE_SALT',        '`[[CpQ~cv5[4KX%@7B<1}GIt3<<O~67@&T9o9M!V>un|BRe}%oN8`VYL[,t[^goW' );
define( 'WP_CACHE_KEY_SALT', 'WO*$AtIt+i1!IM>,fxzW94#GW p6Hpw>yr}q98WyzT@{ {zDygyxuCJ{zz3<kB,9' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix.
 */
$table_prefix = 'wp_';

/* Add any custom values between this line and the "stop editing" line. */

/** ✅ FULL DEBUGGING & LOGGING FOR API ISSUES ✅ **/
define( 'WP_DEBUG', true ); // Enable debugging
define( 'WP_DEBUG_LOG', true ); // Log errors to wp-content/debug.log
define( 'WP_DEBUG_DISPLAY', false ); // Prevents errors from showing on frontend
@ini_set( 'display_errors', 0 );

/** ✅ MEMORY & PERFORMANCE FIXES ✅ **/
define( 'WP_MEMORY_LIMIT', '256M' ); // Prevent memory issues
define( 'WP_MAX_MEMORY_LIMIT', '512M' );

/** ✅ INCREASE API REQUEST TIMEOUT ✅ **/
ini_set( 'max_execution_time', 300 ); // Set to 5 minutes
ini_set( 'default_socket_timeout', 60 ); // Set API timeout to 60 seconds

/** ✅ ENABLE CORS HEADERS (If API Blocking is an Issue) ✅ **/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

/** ✅ ENVIRONMENT TYPE FOR LOCAL DEVELOPMENT ✅ **/
define( 'WP_ENVIRONMENT_TYPE', 'local' );

// cookie/login helpers
define('COOKIE_DOMAIN', $_SERVER['HTTP_HOST']);
define('COOKIEPATH', '/');

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
