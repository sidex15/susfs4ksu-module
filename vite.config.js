// vite.config.js
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
export default defineConfig({
    build: {
        target: 'esnext', //browsers can handle the latest ES features
        supported: {
            'top-level-await': true
        }, //browsers can handle top-level-await features
        rollupOptions: {
            input: {
                main: './index.html',
                credits: './credits.html',
                custom: './custom.html',
                fade: './fade.js',
                i18n: './i18n.js'
            }
        }
    },
    esbuild: {
      supported: {
        'top-level-await': true //browsers can handle top-level-await features
      },
    },
    assetsInclude: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2','**/*.xml'],
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'languages/*',
                    dest: 'languages'
                }
            ]
        })
    ]
})