package com.example.voice_talk_android


object Main {
    // Update this to choose which demo is run
    val current: Environment = Environment.Local

    enum class Environment(val url: String) {
        Remote("https://hotwire-native-demo.dev"),
        Local("http://10.0.2.2:3000")
    }
}