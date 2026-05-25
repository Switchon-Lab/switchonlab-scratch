<?php
/**
 * Plugin Name: SOL Custom Functions
 * Description: SwitchOnLab Scratch iframe with HMAC token authentication
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

/**
 * ショートコード: [switchonlab_scratch project="AppleCatch-l3.sb3"]
 *
 * TOKEN_SECRET は wp-config.php に以下を追記して設定する:
 *   define('SOL_TOKEN_SECRET', 'your-secret-here');
 */
function sol_scratch_iframe_shortcode($atts) {
    $atts = shortcode_atts(['project' => ''], $atts, 'switchonlab_scratch');
    $project = sanitize_text_field($atts['project']);

    if (empty($project)) {
        return '<p style="color:red;">エラー: project パラメータが必要です。</p>';
    }

    $secret = defined('SOL_TOKEN_SECRET') ? SOL_TOKEN_SECRET : getenv('TOKEN_SECRET');
    if (!$secret) {
        return '<p style="color:red;">エラー: TOKEN_SECRET が設定されていません。</p>';
    }

    $ts    = time();
    $token = hash_hmac('sha256', $project . ':' . $ts, $secret);

    $url = add_query_arg(
        [
            'project' => rawurlencode($project),
            'token'   => $token,
            'ts'      => $ts,
        ],
        'https://switchonlab-scratch.vercel.app/'
    );

    return sprintf(
        '<iframe src="%s" width="100%%" height="720" frameborder="0" allowfullscreen loading="lazy"></iframe>',
        esc_url($url)
    );
}
add_shortcode('switchonlab_scratch', 'sol_scratch_iframe_shortcode');
