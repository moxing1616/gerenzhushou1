<template>
  <div class="app">
    <header class="header">
      <h1 class="logo">个人公司助手</h1>
    </header>

    <nav class="nav">
      <button v-for="tab in tabs" :key="tab.value" :class="['nav-btn', { active: activeTab === tab.value }]" @click="activeTab = tab.value">
        {{ tab.label }}
      </button>
    </nav>

    <main class="main">
      <!-- 文章摘要 -->
      <section v-if="activeTab === 'article'" class="section">
        <div class="card">
          <div class="keyword-section">
            <div class="keyword-header">
              <span class="keyword-label">关键词提取</span>
              <label class="switch"><input type="checkbox" v-model="articleKeywordMode"><span class="slider"></span></label>
            </div>
            <input v-if="articleKeywordMode" v-model="articleKeyword" type="text" class="input" placeholder="输入关键词，如：有限空间、安全生产..." />
          </div>
          <div class="upload-zone" @click="triggerUpload('article')" @dragover.prevent @drop.prevent="handleDrop('article', $event)">
            <input ref="articleFileInput" type="file" accept=".txt,.md,.pdf,.doc,.docx,image/*" multiple @change="handleFileChange('article', $event)" hidden />
            <div class="upload-icon">+</div>
            <p class="upload-text">点击或拖拽上传文件</p>
            <p class="upload-hint">支持 TXT、MD、PDF、Word、图片</p>
          </div>
          <div v-if="articleFiles.length" class="file-tags">
            <span v-for="(file, i) in articleFiles" :key="i" class="file-tag">{{ file.name }}<button class="tag-remove" @click="articleFiles.splice(i, 1)">×</button></span>
          </div>
          <textarea v-model="articleContent" class="textarea" placeholder="粘贴文章内容，支持直接粘贴图片..." @paste="handlePaste('article', $event)"></textarea>
          <div v-if="articleImages.length" class="image-grid">
            <div v-for="(img, i) in articleImages" :key="i" class="image-thumb">
              <img :src="img" /><button class="thumb-remove" @click="articleImages.splice(i, 1)">×</button>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="articleLoading || !canSubmitArticle" @click="processArticle">
              <span v-if="articleLoading" class="loading"></span>{{ articleKeywordMode ? '提取内容' : '生成摘要' }}
            </button>
            <button class="btn btn-secondary" @click="clearArticle">清除</button>
          </div>
        </div>
        <div v-if="articleExtracted" class="card result-card">
          <div class="result-header"><h3>提取结果</h3><button class="btn btn-small" @click="summarizeExtracted('article')">总结此内容</button></div>
          <div class="result-content" v-html="formatText(articleExtracted)"></div>
        </div>
        <div v-if="articleError" class="error-toast">{{ articleError }}</div>
        <div v-if="articleSummary" class="card result-card">
          <h3>摘要结果</h3>
          <div class="result-content" v-html="formatText(articleSummary)"></div>
        </div>
      </section>

      <!-- 读书笔记 -->
      <section v-if="activeTab === 'book'" class="section">
        <div class="card">
          <div class="keyword-section">
            <div class="keyword-header">
              <span class="keyword-label">关键词提取</span>
              <label class="switch"><input type="checkbox" v-model="bookKeywordMode"><span class="slider"></span></label>
            </div>
            <input v-if="bookKeywordMode" v-model="bookKeyword" type="text" class="input" placeholder="输入关键词..." />
          </div>
          <div class="upload-zone" @click="triggerUpload('book')" @dragover.prevent @drop.prevent="handleDrop('book', $event)">
            <input ref="bookFileInput" type="file" accept=".txt,.md,.pdf,.doc,.docx,image/*" multiple @change="handleFileChange('book', $event)" hidden />
            <div class="upload-icon">+</div>
            <p class="upload-text">点击或拖拽上传文件</p>
            <p class="upload-hint">支持 TXT、MD、PDF、Word、图片</p>
          </div>
          <div v-if="bookFiles.length" class="file-tags">
            <span v-for="(file, i) in bookFiles" :key="i" class="file-tag">{{ file.name }}<button class="tag-remove" @click="bookFiles.splice(i, 1)">×</button></span>
          </div>
          <input v-model="bookName" type="text" class="input" placeholder="输入书名（可选）" />
          <textarea v-model="bookContent" class="textarea" placeholder="粘贴书籍内容..." @paste="handlePaste('book', $event)"></textarea>
          <div v-if="bookImages.length" class="image-grid">
            <div v-for="(img, i) in bookImages" :key="i" class="image-thumb">
              <img :src="img" /><button class="thumb-remove" @click="bookImages.splice(i, 1)">×</button>
            </div>
          </div>
          <div v-if="!bookKeywordMode" class="type-selector">
            <button v-for="type in summaryTypes" :key="type.value" :class="['type-btn', { active: bookSummaryType === type.value }]" @click="bookSummaryType = type.value">{{ type.label }}</button>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="bookLoading || !canSubmitBook" @click="processBook">
              <span v-if="bookLoading" class="loading"></span>{{ bookKeywordMode ? '提取内容' : '生成笔记' }}
            </button>
            <button class="btn btn-secondary" @click="clearBook">清除</button>
          </div>
        </div>
        <div v-if="bookExtracted" class="card result-card">
          <div class="result-header"><h3>提取结果</h3><button class="btn btn-small" @click="summarizeExtracted('book')">总结此内容</button></div>
          <div class="result-content" v-html="formatText(bookExtracted)"></div>
        </div>
        <div v-if="bookError" class="error-toast">{{ bookError }}</div>
        <div v-if="bookSummary" class="card result-card">
          <template v-if="bookSummaryType === 'mindmap' && !bookKeywordMode">
            <div class="result-header"><h3>思维导图</h3>
              <div class="download-btns"><button class="btn btn-small" @click="downloadMindmap('png')">PNG</button><button class="btn btn-small" @click="downloadMindmap('svg')">SVG</button></div>
            </div>
            <div ref="mindmapRef" class="mindmap-box"><svg ref="mindmapSvg"></svg></div>
          </template>
          <template v-else><h3>读书笔记</h3><div class="result-content" v-html="formatText(bookSummary)"></div></template>
        </div>
      </section>

      <!-- 会议纪要 -->
      <section v-if="activeTab === 'meeting'" class="section">
        <div class="card">
          <!-- 音频源选择 -->
          <div class="audio-source-section">
            <div class="audio-source-header">音频来源</div>
            <div class="audio-source-options">
              <label v-if="!isMobile" :class="['audio-source-option', { active: audioSource === 'system' }]">
                <input type="radio" v-model="audioSource" value="system" />
                <span class="option-icon">🔊</span>
                <span class="option-text">系统声音</span>
                <span class="option-desc">电脑播放的声音</span>
              </label>
              <label :class="['audio-source-option', { active: audioSource === 'mic' }]">
                <input type="radio" v-model="audioSource" value="mic" />
                <span class="option-icon">🎤</span>
                <span class="option-text">麦克风</span>
                <span class="option-desc">{{ isMobile ? '手机麦克风录入' : '麦克风录入' }}</span>
              </label>
              <label v-if="!isMobile" :class="['audio-source-option', { active: audioSource === 'both' }]">
                <input type="radio" v-model="audioSource" value="both" />
                <span class="option-icon">🎧</span>
                <span class="option-text">双向录制</span>
                <span class="option-desc">系统+麦克风</span>
              </label>
            </div>
          </div>

          <!-- 角色识别开关 -->
          <div class="speaker-detection-section">
            <div class="speaker-detection-header">
              <span class="speaker-label">角色识别</span>
              <label class="switch">
                <input type="checkbox" v-model="enableSpeakerDetection" />
                <span class="slider"></span>
              </label>
            </div>
            <p class="speaker-hint">开启后将根据声音特征区分不同说话人（主持人、角色1、角色2...）</p>
          </div>

          <!-- 录音控制 -->
          <div class="voice-control">
            <button :class="['record-btn', { recording: isRecording, pulse: isRecording }]" @click="toggleRecording">
              <svg v-if="!isRecording" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
            <div class="record-status">
              <span class="status-text">{{ isRecording ? '正在录音...' : '点击开始录音' }}</span>
              <span v-if="isRecording" class="record-time">{{ formatTime(recordTime) }}</span>
            </div>
          </div>

          <!-- 实时转录显示 -->
          <div v-if="isRecording || realtimeText" class="realtime-box">
            <div class="realtime-header">
              <span>会议实录</span>
            </div>
            <div class="realtime-content">
              <span class="realtime-final">{{ realtimeFinalText }}</span>
              <span class="realtime-interim">{{ realtimeInterimText }}</span>
              <span v-if="isRecording" class="realtime-cursor">|</span>
            </div>
          </div>

          <!-- 音频波形 -->
          <div v-if="isRecording" class="waveform">
            <div v-for="i in 20" :key="i" class="wave-bar" :style="{ height: waveBars[i-1] + '%' }"></div>
          </div>

          <!-- 上传音频 -->
          <div class="upload-zone" @click="triggerUpload('voice')">
            <input ref="voiceFileInput" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" @change="handleAudioUpload" hidden />
            <div class="upload-icon">🎵</div>
            <p class="upload-text">或上传会议录音</p>
            <p class="upload-hint">支持 MP3、WAV、M4A 等格式</p>
          </div>

          <!-- 已上传/录制音频 -->
          <div v-if="audioFile" class="file-tags">
            <span class="file-tag">
              {{ audioFile.name }}
              <button class="tag-remove" @click="audioFile = null">×</button>
            </span>
            <button class="btn btn-small" @click="downloadAudio">下载录音</button>
          </div>

          <!-- 转录结果 -->
          <div v-if="voiceTranscript" class="transcript-box">
            <div class="transcript-header">
              <span>会议记录</span>
              <div class="transcript-actions">
                <button class="btn btn-small" @click="copyTranscript">复制</button>
                <button class="btn btn-small" @click="downloadTranscript">下载原文</button>
              </div>
            </div>
            <textarea v-model="voiceTranscript" class="textarea transcript-text"></textarea>
          </div>

          <!-- 纪要类型 -->
          <div v-if="voiceTranscript" class="type-selector">
            <button v-for="type in voiceSummaryTypes" :key="type.value" :class="['type-btn', { active: voiceSummaryType === type.value }]" @click="voiceSummaryType = type.value">{{ type.label }}</button>
          </div>

          <!-- 操作按钮 -->
          <div class="actions">
            <button class="btn btn-primary" :disabled="voiceLoading || (!voiceTranscript && !audioFile && !isRecording)" @click="processVoice">
              <span v-if="voiceLoading" class="loading"></span>{{ voiceTranscript ? '生成纪要' : '开始转录' }}
            </button>
            <button class="btn btn-secondary" @click="clearVoice">清除</button>
          </div>
        </div>

        <div v-if="voiceError" class="error-toast">{{ voiceError }}</div>

        <div v-if="voiceSummary" class="card result-card">
          <div class="result-header">
            <h3>{{ voiceSummaryTypeLabel }}</h3>
            <button class="btn btn-small" @click="downloadSummary">下载纪要</button>
          </div>
          <div class="result-content" v-html="formatText(voiceSummary)"></div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onUnmounted } from 'vue'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'
import * as htmlToImage from 'html-to-image'

const tabs = [{ value: 'article', label: '文章总结' }, { value: 'book', label: '读书笔记' }, { value: 'meeting', label: '会议纪要' }]
const activeTab = ref('article')
const summaryTypes = [{ value: 'complete', label: '完整总结' }, { value: 'keypoints', label: '要点提炼' }, { value: 'mindmap', label: '思维导图' }, { value: 'actionable', label: '行动清单' }]
const voiceSummaryTypes = [{ value: 'meeting', label: '会议纪要' }, { value: 'keypoints', label: '要点提取' }, { value: 'todo', label: '待办事项' }, { value: 'decision', label: '决策记录' }]

// 文章相关
const articleContent = ref(''), articleImages = ref([]), articleFiles = ref([]), articleKeywordMode = ref(false), articleKeyword = ref(''), articleExtracted = ref(''), articleSummary = ref(''), articleLoading = ref(false), articleError = ref('')
const articleFileInput = ref(null)

// 读书相关
const bookName = ref(''), bookContent = ref(''), bookImages = ref([]), bookFiles = ref([]), bookKeywordMode = ref(false), bookKeyword = ref(''), bookExtracted = ref(''), bookSummary = ref(''), bookLoading = ref(false), bookError = ref(''), bookSummaryType = ref('complete')
const bookFileInput = ref(null), mindmapRef = ref(null), mindmapSvg = ref(null)
let markmapInstance = null

// 语音相关
const voiceFileInput = ref(null), audioFile = ref(null), voiceTranscript = ref(''), voiceSummary = ref(''), voiceLoading = ref(false), voiceError = ref(''), voiceSummaryType = ref('meeting')
const isRecording = ref(false), recordTime = ref(0), waveBars = ref(Array(20).fill(10))
const realtimeFinalText = ref(''), realtimeInterimText = ref(''), speechSupported = ref(false)
// 检测是否为移动设备
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
const audioSource = ref(isMobile ? 'mic' : 'system') // 移动端默认麦克风，桌面端默认系统声音
const enableSpeakerDetection = ref(true) // 说话人识别默认开启（UI已隐藏）
let mediaRecorder = null, audioChunks = [], recordTimer = null, audioContext = null, analyser = null, animationId = null, speechRecognition = null
let allFinalText = '' // 所有已确认的文本（跨会话累积）
let currentStream = null // 当前音频流
let chunkAudioChunks = [] // 分段音频数据
let chunkTranscribeTimer = null // 分段转录定时器

// 检查浏览器是否支持 Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
speechSupported.value = !!SpeechRecognition

const realtimeText = computed(() => realtimeFinalText.value + realtimeInterimText.value)

// 生产环境使用环境变量，开发环境使用本地地址
const API_BASE = import.meta.env.VITE_API_URL || (window.location.protocol + '//' + window.location.hostname + ':3006/api')
const canSubmitArticle = computed(() => articleContent.value.trim() || articleImages.value.length || articleFiles.value.length)
const canSubmitBook = computed(() => bookContent.value.trim() || bookName.value.trim() || bookImages.value.length || bookFiles.value.length)
const voiceSummaryTypeLabel = computed(() => voiceSummaryTypes.find(t => t.value === voiceSummaryType.value)?.label || '总结结果')

function triggerUpload(target) {
  if (target === 'article') articleFileInput.value?.click()
  else if (target === 'book') bookFileInput.value?.click()
  else if (target === 'voice') voiceFileInput.value?.click()
}

function handleFileChange(target, e) { processFiles(e.target.files, target) }
function handleDrop(target, e) { processFiles(e.dataTransfer.files, target) }
function processFiles(files, target) {
  const imgs = target === 'article' ? articleImages : bookImages
  const docs = target === 'article' ? articleFiles : bookFiles
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => imgs.value.push(e.target.result)
      reader.readAsDataURL(file)
    } else { docs.value.push({ name: file.name, type: file.type, file }) }
  }
}

function handlePaste(target, e) {
  const imgs = target === 'article' ? articleImages : bookImages
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) { const reader = new FileReader(); reader.onload = (ev) => imgs.value.push(ev.target.result); reader.readAsDataURL(file) }
      return
    }
  }
}

async function readFileContent(fileObj) {
  return new Promise((resolve) => {
    const file = fileObj.file, reader = new FileReader()
    if (file.type === 'application/pdf') {
      reader.onload = async (e) => {
        try { const res = await fetch(API_BASE + '/parse-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: e.target.result.split(',')[1], filename: file.name }) }); const data = await res.json(); resolve(data.text || '') } catch { resolve('') }
      }
      reader.readAsDataURL(file)
    } else { reader.onload = (e) => resolve(e.target.result); reader.readAsText(file) }
  })
}

async function processArticle() {
  articleLoading.value = true; articleError.value = ''; articleExtracted.value = ''; articleSummary.value = ''
  try {
    let fileContents = ''; for (const f of articleFiles.value) { const c = await readFileContent(f); if (c) fileContents += '\n\n--- ' + f.name + ' ---\n' + c }
    const fullContent = articleContent.value + fileContents
    if (articleKeywordMode.value && articleKeyword.value.trim()) {
      const res = await fetch(API_BASE + '/extract-keyword', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: fullContent, images: articleImages.value, keyword: articleKeyword.value }) })
      const data = await res.json(); if (data.error) articleError.value = data.error; else articleExtracted.value = data.extracted
    } else {
      const res = await fetch(API_BASE + '/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: fullContent, images: articleImages.value }) })
      const data = await res.json(); if (data.error) articleError.value = data.error; else articleSummary.value = data.summary
    }
  } catch { articleError.value = '网络错误' } finally { articleLoading.value = false }
}

async function processBook() {
  bookLoading.value = true; bookError.value = ''; bookExtracted.value = ''; bookSummary.value = ''
  try {
    let fileContents = ''; for (const f of bookFiles.value) { const c = await readFileContent(f); if (c) fileContents += '\n\n--- ' + f.name + ' ---\n' + c }
    const fullContent = bookContent.value + fileContents
    if (bookKeywordMode.value && bookKeyword.value.trim()) {
      const res = await fetch(API_BASE + '/extract-keyword', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: fullContent, images: bookImages.value, keyword: bookKeyword.value }) })
      const data = await res.json(); if (data.error) bookError.value = data.error; else bookExtracted.value = data.extracted
    } else {
      const res = await fetch(API_BASE + '/book-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookName: bookName.value, content: fullContent, images: bookImages.value, summaryType: bookSummaryType.value }) })
      const data = await res.json(); if (data.error) bookError.value = data.error; else bookSummary.value = data.summary
    }
  } catch { bookError.value = '网络错误' } finally { bookLoading.value = false }
}

async function summarizeExtracted(target) {
  const content = target === 'article' ? articleExtracted.value : bookExtracted.value
  if (target === 'article') { articleLoading.value = true; articleError.value = '' } else { bookLoading.value = true; bookError.value = '' }
  try {
    const res = await fetch(API_BASE + '/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, images: [] }) })
    const data = await res.json()
    if (target === 'article') { if (data.error) articleError.value = data.error; else articleSummary.value = data.summary }
    else { if (data.error) bookError.value = data.error; else bookSummary.value = data.summary }
  } catch { if (target === 'article') articleError.value = '网络错误'; else bookError.value = '网络错误' }
  finally { if (target === 'article') articleLoading.value = false; else bookLoading.value = false }
}

function formatText(text) { return text.replace(/\n/g, '<br>') }
function clearArticle() { articleContent.value = ''; articleImages.value = []; articleFiles.value = []; articleKeyword.value = ''; articleExtracted.value = ''; articleSummary.value = ''; articleError.value = '' }
function clearBook() { bookName.value = ''; bookContent.value = ''; bookImages.value = []; bookFiles.value = []; bookKeyword.value = ''; bookExtracted.value = ''; bookSummary.value = ''; bookError.value = ''; markmapInstance = null }

async function renderMindmap(md) {
  await nextTick(); if (!mindmapSvg.value) return
  const { root } = new Transformer().transform(md); mindmapSvg.value.innerHTML = ''
  markmapInstance = Markmap.create(mindmapSvg.value, { autoFit: true, color: (n) => ['#007AFF','#34C759','#FF9500','#FF3B30','#AF52DE','#5AC8FA'][n.state.depth % 6], paddingX: 16, spacingHorizontal: 80, spacingVertical: 10 }, root)
  setTimeout(() => markmapInstance?.fit(), 100)
}

async function downloadMindmap(fmt) {
  if (!mindmapRef.value) return
  try {
    if (fmt === 'svg') { const blob = new Blob([new XMLSerializer().serializeToString(mindmapSvg.value)], { type: 'image/svg+xml' }); const url = URL.createObjectURL(blob); downloadFile(url, 'mindmap.svg'); URL.revokeObjectURL(url) }
    else { const dataUrl = await htmlToImage.toPng(mindmapRef.value, { backgroundColor: '#fff', pixelRatio: 2 }); downloadFile(dataUrl, 'mindmap.png') }
  } catch { bookError.value = '下载失败' }
}

function downloadFile(url, name) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a) }

watch(bookSummary, async (val) => { if (val && bookSummaryType.value === 'mindmap' && !bookKeywordMode.value) await renderMindmap(val) })

// 语音录制相关
async function toggleRecording() {
  if (isRecording.value) { stopRecording() }
  else { await startRecording() }
}

async function startRecording() {
  voiceError.value = '' // 清除之前的错误
  try {
    let stream = null

    // 根据音频源选择获取不同的流
    if (audioSource.value === 'system') {
      // 只录制系统声音（需要屏幕共享）
      if (!navigator.mediaDevices.getDisplayMedia) {
        voiceError.value = '当前浏览器不支持系统声音录制，请使用麦克风模式'
        return
      }
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 }, // 最小化视频
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
        // 只保留音频轨道，停止视频轨道
        stream.getVideoTracks().forEach(track => track.stop())
        if (stream.getAudioTracks().length === 0) {
          throw new Error('未选择系统音频')
        }
      } catch (e) {
        voiceError.value = '请在弹窗中选择要共享的窗口，并勾选"共享系统音频"'
        return
      }
    } else if (audioSource.value === 'mic') {
      // 只录制麦克风
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        voiceError.value = '当前浏览器不支持麦克风录制'
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        if (e.name === 'NotAllowedError') {
          voiceError.value = '请允许麦克风权限后重试'
        } else if (e.name === 'NotFoundError') {
          voiceError.value = '未检测到麦克风设备'
        } else {
          voiceError.value = '无法访问麦克风: ' + e.message
        }
        return
      }
    } else if (audioSource.value === 'both') {
      // 同时录制系统声音和麦克风
      try {
        const systemStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1, height: 1 },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        })
        systemStream.getVideoTracks().forEach(track => track.stop())

        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })

        // 合并两个音频流
        const audioCtx = new AudioContext()
        const dest = audioCtx.createMediaStreamDestination()

        if (systemStream.getAudioTracks().length > 0) {
          const systemSource = audioCtx.createMediaStreamSource(systemStream)
          systemSource.connect(dest)
        }

        const micSource = audioCtx.createMediaStreamSource(micStream)
        micSource.connect(dest)

        stream = dest.stream

        // 保存原始流以便后续停止
        currentStream = { systemStream, micStream, audioCtx }
      } catch (e) {
        voiceError.value = '请在弹窗中选择要共享的窗口，并勾选"共享系统音频"'
        return
      }
    }

    // 尝试使用更兼容的音频格式
    const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
    let selectedMimeType = ''
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type
        break
      }
    }
    console.log('使用音频格式:', selectedMimeType || '默认')

    mediaRecorder = selectedMimeType
      ? new MediaRecorder(stream, { mimeType: selectedMimeType })
      : new MediaRecorder(stream)

    audioChunks = []
    realtimeFinalText.value = ''
    realtimeInterimText.value = ''
    allFinalText = ''

    // 音频分析
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    analyser.fftSize = 64
    updateWaveform()

    // 启动实时语音识别（仅在有麦克风时有效）
    if (SpeechRecognition && (audioSource.value === 'mic' || audioSource.value === 'both')) {
      speechRecognition = new SpeechRecognition()
      speechRecognition.continuous = true
      speechRecognition.interimResults = true
      speechRecognition.lang = 'zh-CN'
      speechRecognition.maxAlternatives = 1

      speechRecognition.onresult = (event) => {
        let currentSessionFinal = ''
        let interimText = ''

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            currentSessionFinal += transcript
          } else {
            interimText += transcript
          }
        }

        realtimeFinalText.value = allFinalText + currentSessionFinal
        realtimeInterimText.value = interimText
      }

      speechRecognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error)
      }

      speechRecognition.onend = () => {
        const currentInterim = realtimeInterimText.value
        if (currentInterim) {
          allFinalText = realtimeFinalText.value + currentInterim
          realtimeFinalText.value = allFinalText
          realtimeInterimText.value = ''
        } else {
          allFinalText = realtimeFinalText.value
        }

        if (isRecording.value && speechRecognition) {
          setTimeout(() => {
            if (isRecording.value && speechRecognition) {
              try { speechRecognition.start() } catch (e) {}
            }
          }, 50)
        }
      }

      try { speechRecognition.start() } catch {}
    }

    // 系统音频使用分段转录实现实时显示
    if (audioSource.value === 'system') {
      realtimeInterimText.value = ''
      startChunkRecording()
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data)
        // 系统音频模式下，同时收集用于分段转录
        if (audioSource.value === 'system') {
          chunkAudioChunks.push(e.data)
        }
      }
    }
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      audioFile.value = { name: 'recording.webm', blob }

      // 停止分段转录
      stopChunkRecording()

      // 停止所有轨道
      stream.getTracks().forEach(t => t.stop())
      if (currentStream) {
        if (currentStream.systemStream) currentStream.systemStream.getTracks().forEach(t => t.stop())
        if (currentStream.micStream) currentStream.micStream.getTracks().forEach(t => t.stop())
        if (currentStream.audioCtx) currentStream.audioCtx.close()
        currentStream = null
      }

      if (audioContext) { audioContext.close(); audioContext = null }
      cancelAnimationFrame(animationId)

      if (speechRecognition) {
        try { speechRecognition.stop() } catch {}
        speechRecognition = null
      }

      // 清理 interim 提示
      if (realtimeInterimText.value === '正在转录系统音频...') {
        realtimeInterimText.value = ''
      }

      const finalText = realtimeFinalText.value
      if (finalText) {
        voiceTranscript.value = finalText
      }
    }

    // 使用 timeslice 参数，每秒收集一次数据
    mediaRecorder.start(1000)
    isRecording.value = true
    recordTime.value = 0
    recordTimer = setInterval(() => recordTime.value++, 1000)
  } catch (err) {
    console.error('Recording error:', err)
    voiceError.value = '无法访问音频设备，请检查权限设置'
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  // 停止分段转录定时器
  stopChunkRecording()
  isRecording.value = false
  clearInterval(recordTimer)
}

function updateWaveform() {
  if (!analyser) return
  const data = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(data)
  const bars = []
  for (let i = 0; i < 20; i++) {
    const idx = Math.floor(i * data.length / 20)
    bars.push(Math.max(10, (data[idx] / 255) * 100))
  }
  waveBars.value = bars
  animationId = requestAnimationFrame(updateWaveform)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
}

function handleAudioUpload(e) {
  const file = e.target.files[0]
  if (file) { audioFile.value = { name: file.name, blob: file } }
}

async function processVoice() {
  if (voiceTranscript.value) {
    // 已有转录文本，生成总结
    voiceLoading.value = true; voiceError.value = ''; voiceSummary.value = ''
    try {
      const res = await fetch(API_BASE + '/voice-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcript: voiceTranscript.value, summaryType: voiceSummaryType.value }) })
      const data = await res.json()
      if (data.error) voiceError.value = data.error; else voiceSummary.value = data.summary
    } catch { voiceError.value = '网络错误' } finally { voiceLoading.value = false }
  } else if (audioFile.value) {
    // 有音频文件，先转录
    voiceLoading.value = true; voiceError.value = ''; voiceTranscript.value = ''
    try {
      const formData = new FormData()
      formData.append('audio', audioFile.value.blob, audioFile.value.name)
      formData.append('enableSpeaker', enableSpeakerDetection.value ? 'true' : 'false')
      const res = await fetch(API_BASE + '/transcribe', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.error) {
        voiceError.value = data.error
      } else if (data.transcript) {
        // 逐字显示效果
        for (let i = 0; i < data.transcript.length; i++) {
          voiceTranscript.value += data.transcript[i]
          await new Promise(r => setTimeout(r, 20))
        }
      }
    } catch { voiceError.value = '网络错误' } finally { voiceLoading.value = false }
  }
}

function copyTranscript() {
  navigator.clipboard.writeText(voiceTranscript.value)
}

function downloadTranscript() {
  const blob = new Blob([voiceTranscript.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `会议记录_${new Date().toLocaleString().replace(/[/:]/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadAudio() {
  if (!audioFile.value || !audioFile.value.blob) return
  const url = URL.createObjectURL(audioFile.value.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `会议录音_${new Date().toLocaleString().replace(/[/:]/g, '-')}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadSummary() {
  const blob = new Blob([voiceSummary.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${voiceSummaryTypeLabel.value}_${new Date().toLocaleString().replace(/[/:]/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 系统音频分段转录
let transcribeQueue = []
let isProcessingQueue = false

async function transcribeChunk(blob) {
  console.log('发送音频转录, 大小:', blob.size, 'bytes')

  try {
    const formData = new FormData()
    formData.append('audio', blob, 'chunk.webm')
    formData.append('enableSpeaker', enableSpeakerDetection.value ? 'true' : 'false')

    realtimeInterimText.value = '正在识别...'

    const res = await fetch(API_BASE + '/transcribe', { method: 'POST', body: formData })
    const data = await res.json()

    console.log('转录返回:', data)

    if (data.transcript && data.transcript.trim()) {
      const text = data.transcript.trim()
      // 直接追加到最终文本
      allFinalText += text + '\n'
      realtimeFinalText.value = allFinalText
      realtimeInterimText.value = ''
    } else {
      realtimeInterimText.value = ''
    }
  } catch (e) {
    console.log('转录错误:', e)
    realtimeInterimText.value = ''
  }
}

// 分段录制 - 累积方式，每次发送从开始到当前的完整音频
let lastTranscribedLength = 0 // 上次转录时的音频长度

function startChunkRecording() {
  chunkAudioChunks = []
  lastTranscribedLength = 0
  transcribeQueue = []
  isProcessingQueue = false

  // 每10秒转录一次
  chunkTranscribeTimer = setInterval(() => {
    if (chunkAudioChunks.length > lastTranscribedLength && isRecording.value) {
      // 发送从上次位置到当前的新数据
      const newChunks = chunkAudioChunks.slice(lastTranscribedLength)
      // 需要包含第一个chunk（包含webm头部）
      const chunksToSend = lastTranscribedLength === 0 ? newChunks : [chunkAudioChunks[0], ...newChunks]
      const blob = new Blob(chunksToSend, { type: 'audio/webm' })

      lastTranscribedLength = chunkAudioChunks.length

      if (blob.size > 3000) {
        console.log('发送音频，包含chunks:', chunksToSend.length)
        transcribeChunk(blob)
      }
    }
  }, 10000)

  console.log('分段转录已启动')
}

function stopChunkRecording() {
  if (chunkTranscribeTimer) {
    clearInterval(chunkTranscribeTimer)
    chunkTranscribeTimer = null
  }
  // 处理剩余的音频
  if (chunkAudioChunks.length > lastTranscribedLength) {
    const newChunks = chunkAudioChunks.slice(lastTranscribedLength)
    const chunksToSend = lastTranscribedLength === 0 ? newChunks : [chunkAudioChunks[0], ...newChunks]
    const blob = new Blob(chunksToSend, { type: 'audio/webm' })
    if (blob.size > 3000) {
      transcribeChunk(blob)
    }
  }
  chunkAudioChunks = []
  lastTranscribedLength = 0
  console.log('分段转录已停止')
}

function clearVoice() {
  if (isRecording.value) stopRecording()
  stopChunkRecording()
  transcribeQueue = []
  isProcessingQueue = false
  audioFile.value = null; voiceTranscript.value = ''; voiceSummary.value = ''; voiceError.value = ''
  realtimeFinalText.value = ''; realtimeInterimText.value = ''; allFinalText = ''
}

onUnmounted(() => {
  if (isRecording.value) stopRecording()
  if (audioContext) audioContext.close()
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #f5f5f7 0%, #fff 100%); min-height: 100vh; color: #1d1d1f; }
.app { max-width: 680px; margin: 0 auto; padding: 0 20px 40px; }
.header { padding: 40px 0 20px; text-align: center; }
.logo { font-size: 32px; font-weight: 600; background: linear-gradient(90deg, #007AFF, #5856D6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.nav { display: flex; gap: 8px; padding: 6px; background: rgba(0,0,0,0.04); border-radius: 12px; margin-bottom: 24px; }
.nav-btn { flex: 1; padding: 12px 16px; border: none; background: transparent; border-radius: 8px; font-size: 14px; font-weight: 500; color: #86868b; cursor: pointer; transition: all 0.2s; }
.nav-btn.active { background: #fff; color: #1d1d1f; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.nav-btn:hover:not(.active) { color: #1d1d1f; }
.card { background: #fff; border-radius: 20px; padding: 24px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.keyword-section { margin-bottom: 20px; }
.keyword-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.keyword-label { font-size: 15px; font-weight: 500; color: #1d1d1f; }
.switch { position: relative; width: 51px; height: 31px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #e9e9eb; border-radius: 31px; transition: 0.3s; }
.slider:before { position: absolute; content: ""; height: 27px; width: 27px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.switch input:checked + .slider { background: #34C759; }
.switch input:checked + .slider:before { transform: translateX(20px); }
.input { width: 100%; padding: 14px 16px; border: 1px solid #e5e5e5; border-radius: 12px; font-size: 16px; background: #fafafa; transition: all 0.2s; margin-bottom: 16px; }
.input:focus { outline: none; border-color: #007AFF; background: #fff; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }
.upload-zone { border: 2px dashed #d2d2d7; border-radius: 16px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
.upload-zone:hover { border-color: #007AFF; background: rgba(0,122,255,0.02); }
.upload-icon { font-size: 32px; color: #007AFF; margin-bottom: 8px; }
.upload-text { font-size: 15px; color: #1d1d1f; margin-bottom: 4px; }
.upload-hint { font-size: 13px; color: #86868b; }
.file-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.file-tag { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #f5f5f7; border-radius: 20px; font-size: 13px; color: #1d1d1f; }
.tag-remove { width: 18px; height: 18px; border: none; background: #86868b; color: #fff; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tag-remove:hover { background: #ff3b30; }
.textarea { width: 100%; min-height: 160px; padding: 16px; border: 1px solid #e5e5e5; border-radius: 12px; font-size: 16px; line-height: 1.5; resize: vertical; background: #fafafa; transition: all 0.2s; }
.textarea:focus { outline: none; border-color: #007AFF; background: #fff; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }
.image-grid { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.image-thumb { position: relative; width: 72px; height: 72px; border-radius: 10px; overflow: hidden; }
.image-thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-remove { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; border: none; background: rgba(0,0,0,0.6); color: #fff; border-radius: 50%; font-size: 12px; cursor: pointer; }
.type-selector { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.type-btn { padding: 10px 18px; border: 1px solid #e5e5e5; background: #fff; border-radius: 20px; font-size: 14px; color: #86868b; cursor: pointer; transition: all 0.2s; }
.type-btn.active { background: #007AFF; color: #fff; border-color: #007AFF; }
.type-btn:hover:not(.active) { border-color: #007AFF; color: #007AFF; }
.actions { display: flex; gap: 12px; margin-top: 20px; }
.btn { flex: 1; padding: 16px 24px; border: none; border-radius: 14px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
.btn-primary { background: #007AFF; color: #fff; }
.btn-primary:hover:not(:disabled) { background: #0066d6; }
.btn-primary:disabled { background: #d2d2d7; cursor: not-allowed; }
.btn-secondary { background: #f5f5f7; color: #1d1d1f; }
.btn-secondary:hover { background: #e8e8ed; }
.btn-small { flex: none; padding: 8px 16px; font-size: 14px; border-radius: 8px; background: #f5f5f7; color: #007AFF; }
.btn-small:hover { background: #e8e8ed; }
.loading { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.result-card { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.result-card h3 { font-size: 17px; font-weight: 600; color: #1d1d1f; margin-bottom: 16px; }
.result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.result-header h3 { margin-bottom: 0; }
.result-content { font-size: 15px; line-height: 1.8; color: #424245; }
.download-btns { display: flex; gap: 8px; }
.mindmap-box { width: 100%; height: 400px; border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; background: #fafafa; }
.mindmap-box svg { width: 100%; height: 100%; }
.error-toast { padding: 14px 20px; background: #fff2f0; border: 1px solid #ffccc7; border-radius: 12px; color: #ff3b30; font-size: 14px; margin-bottom: 16px; animation: fadeIn 0.3s ease; }

/* 语音录制样式 */
.voice-control { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
.record-btn { width: 80px; height: 80px; border-radius: 50%; border: none; background: linear-gradient(135deg, #007AFF, #5856D6); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s; box-shadow: 0 4px 20px rgba(0,122,255,0.3); }
.record-btn:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,122,255,0.4); }
.record-btn.recording { background: linear-gradient(135deg, #FF3B30, #FF9500); box-shadow: 0 4px 20px rgba(255,59,48,0.3); }
.record-btn.pulse { animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { box-shadow: 0 4px 20px rgba(255,59,48,0.3); } 50% { box-shadow: 0 4px 30px rgba(255,59,48,0.6); } }
.record-status { flex: 1; }
.status-text { display: block; font-size: 17px; font-weight: 500; color: #1d1d1f; margin-bottom: 4px; }
.record-time { font-size: 28px; font-weight: 600; color: #FF3B30; font-variant-numeric: tabular-nums; }
.waveform { display: flex; align-items: center; justify-content: center; gap: 4px; height: 60px; margin-bottom: 24px; padding: 0 20px; }
.wave-bar { width: 8px; background: linear-gradient(180deg, #007AFF, #5856D6); border-radius: 4px; transition: height 0.1s ease; }
.transcript-box { margin-bottom: 16px; }
.transcript-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 15px; font-weight: 500; color: #1d1d1f; }
.transcript-actions { display: flex; gap: 8px; }
.transcript-text { min-height: 120px; }

/* 实时转录样式 */
.realtime-box { background: #f5f5f7; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.realtime-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 500; color: #1d1d1f; }
.realtime-hint { font-size: 12px; color: #86868b; font-weight: 400; }
.realtime-content { min-height: 60px; font-size: 16px; line-height: 1.6; color: #1d1d1f; }
.realtime-final { color: #1d1d1f; }
.realtime-interim { color: #86868b; }
.realtime-cursor { animation: blink 1s step-end infinite; color: #007AFF; }
@keyframes blink { 50% { opacity: 0; } }

/* 音频源选择样式 */
.audio-source-section { margin-bottom: 24px; }
.audio-source-header { font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 12px; }
.audio-source-options { display: flex; gap: 12px; flex-wrap: wrap; }
.audio-source-option { flex: 1; min-width: 140px; padding: 16px; border: 2px solid #e5e5e5; border-radius: 16px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; text-align: center; }
.audio-source-option input { display: none; }
.audio-source-option:hover { border-color: #007AFF; background: rgba(0,122,255,0.02); }
.audio-source-option.active { border-color: #007AFF; background: rgba(0,122,255,0.05); }
.option-icon { font-size: 28px; margin-bottom: 8px; }
.option-text { font-size: 15px; font-weight: 600; color: #1d1d1f; margin-bottom: 4px; }
.option-desc { font-size: 12px; color: #86868b; }

/* 说话人识别样式 */
.speaker-detection-section { margin-bottom: 24px; padding: 16px; background: #f5f5f7; border-radius: 12px; }
.speaker-detection-header { display: flex; align-items: center; justify-content: space-between; }
.speaker-label { font-size: 15px; font-weight: 600; color: #1d1d1f; }
.speaker-hint { font-size: 13px; color: #86868b; margin-top: 8px; margin-bottom: 0; }

@media (max-width: 600px) {
  .header { padding: 24px 0 16px; }
  .logo { font-size: 26px; }
  .nav { margin-bottom: 16px; }
  .nav-btn { padding: 10px 12px; font-size: 13px; }
  .card { padding: 20px; border-radius: 16px; }
  .upload-zone { padding: 24px 16px; }
  .actions { flex-direction: column; }
  .btn { padding: 14px 20px; }
  .image-thumb { width: 60px; height: 60px; }
  .mindmap-box { height: 300px; }
  .record-btn { width: 70px; height: 70px; }
  .record-time { font-size: 24px; }
  .waveform { height: 50px; }
  .wave-bar { width: 6px; }
  .audio-source-options { flex-direction: column; }
  .audio-source-option { min-width: 100%; }
}
</style>
