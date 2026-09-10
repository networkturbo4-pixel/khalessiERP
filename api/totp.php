<?php
// api/totp.php - Implementación nativa RFC 6238 para Google Authenticator

class GoogleAuthenticator {
    private static $base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Genera un secreto aleatorio Base32 de 16 caracteres
     */
    public static function generateSecret($length = 16) {
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::$base32chars[random_int(0, 31)];
        }
        return $secret;
    }

    /**
     * Calcula el código de 6 dígitos para un secreto y ventana de tiempo
     */
    public static function getCode($secret, $timeSlice = null) {
        if ($timeSlice === null) {
            $timeSlice = floor(time() / 30);
        }
        $secretKey = self::base32Decode($secret);
        if ($secretKey === false) return false;

        $time = pack("N*", 0) . pack("N*", $timeSlice);
        $hmac = hash_hmac('sha1', $time, $secretKey, true);
        $offset = ord(substr($hmac, -1)) & 0x0F;
        $hashpart = substr($hmac, $offset, 4);
        $value = unpack("N", $hashpart)[1] & 0x7FFFFFFF;
        return str_pad($value % 1000000, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Verifica si un código de 6 dígitos es válido con tolerancia de desfase (default +/- 1 ventana de 30s)
     */
    public static function verifyCode($secret, $code, $discrepancy = 1) {
        if (empty($secret) || empty($code)) return false;
        $code = trim($code);
        $currentTimeSlice = floor(time() / 30);
        
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculated = self::getCode($secret, $currentTimeSlice + $i);
            if ($calculated !== false && hash_equals((string)$calculated, (string)$code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Decodifica una cadena Base32 a binario
     */
    private static function base32Decode($b32) {
        $b32 = strtoupper(trim($b32));
        if (empty($b32)) return '';
        $chars = self::$base32chars;
        $buffer = 0;
        $bitsLeft = 0;
        $result = '';

        for ($i = 0; $i < strlen($b32); $i++) {
            $ch = $b32[$i];
            if ($ch == '=') break;
            $val = strpos($chars, $ch);
            if ($val === false) return false;
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $result .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }
        return $result;
    }

    /**
     * Genera la URL para el código QR que se escanea en la app Google Authenticator
     */
    public static function getQrCodeUrl($companyName, $accountName, $secret) {
        $otpauth = 'otpauth://totp/' . rawurlencode($companyName . ':' . $accountName) . '?secret=' . $secret . '&issuer=' . rawurlencode($companyName);
        return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . rawurlencode($otpauth);
    }
}
