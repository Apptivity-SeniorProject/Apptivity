package com.example.apptivitybackend.constants;

/**
 * Uygulama genelinde kullanılan sabit değerler.
 * Örn: JWT secret key adı, rol isimleri, API prefix, hata mesajları.
 */
public final class AppConstants {

    private AppConstants() {}

    public static final String API_PREFIX = "/api/v1";

    public static final String ROLE_USER  = "ROLE_USER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    public static final String TOKEN_PREFIX  = "Bearer ";
    public static final String HEADER_STRING = "Authorization";
}
