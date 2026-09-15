package com.example.agenriod.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = AgenriodDarkIndigo,
    secondary = Color(0xFF7DD3C7),
    tertiary = Color(0xFFF5C2E7),
    surface = AgenriodDarkSurface,
    background = Color(0xFF101117)
)

private val LightColorScheme = lightColorScheme(
    primary = AgenriodIndigo,
    primaryContainer = AgenriodLavender,
    secondary = AgenriodTeal,
    tertiary = Color(0xFF9D174D),
    background = AgenriodPaper,
    surface = Color.White,
    surfaceVariant = Color(0xFFEEF0F7),
    onBackground = AgenriodInk,
    onSurface = AgenriodInk
)

@Composable
fun AgenriodTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
