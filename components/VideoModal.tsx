import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { X, AlertCircle, Globe, ExternalLink } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';

interface VideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string | null;
  exerciseName: string;
  exerciseDescription?: string | null;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Função para extrair ID do YouTube de diferentes formatos de URL
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  
  console.log('🔍 URL original recebida:', url);
  
  // Forçar HTTPS e limpar parâmetros desnecessários
  let cleanUrl = url.replace(/^http:/, 'https:');
  
  // Remover parâmetros do compartilhamento (?si=, ?feature=, etc)
  cleanUrl = cleanUrl.split('?si=')[0];
  cleanUrl = cleanUrl.split('&si=')[0];
  cleanUrl = cleanUrl.split('?feature=')[0];
  
  console.log('🧹 URL limpa:', cleanUrl);
  
  // Padrões de URL do YouTube (incluindo Shorts)
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#\/]+)/, // YouTube Shorts
    /youtube\.com\/embed\/([^&\n?#\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // ID direto
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      console.log('✅ YouTube ID extraído:', match[1]);
      return match[1];
    }
  }
  
  console.log('❌ Não foi possível extrair ID do YouTube da URL');
  return null;
};

export default function VideoModal({
  visible,
  onClose,
  videoUrl,
  exerciseName,
  exerciseDescription,
}: VideoModalProps) {
  const { colors } = useTheme();
  const videoRef = React.useRef<Video>(null);
  const [status, setStatus] = React.useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Detectar tipo de vídeo
  const youtubeVideoId = videoUrl ? getYouTubeVideoId(videoUrl) : null;
  const isYouTube = !!youtubeVideoId;
  const isSupabaseUrl = videoUrl?.includes('supabase.co/storage') || 
                        videoUrl?.includes('supabase.in/storage');
  
  // Sempre usar WebView para YouTube e Supabase
  const [useWebView, setUseWebView] = useState(isYouTube || isSupabaseUrl);

  // Log quando o modal abrir
  useEffect(() => {
    if (visible && videoUrl) {
      console.log('🎬 VIDEO MODAL: Modal aberto');
      console.log('🎬 VIDEO MODAL: URL original:', videoUrl);
      console.log('🎬 VIDEO MODAL: Exercício:', exerciseName);
      
      const ytId = getYouTubeVideoId(videoUrl);
      const isYT = !!ytId;
      
      // Se for YouTube, abrir diretamente no app sem perguntar
      if (isYT && ytId) {
        console.log('📺 Detectado YouTube - Abrindo no app automaticamente...');
        const youtubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
        
        Linking.openURL(youtubeUrl)
          .then(() => {
            console.log('✅ YouTube aberto com sucesso');
            // Fechar o modal após um pequeno delay
            setTimeout(() => onClose(), 500);
          })
          .catch(err => {
            console.error('❌ Erro ao abrir YouTube:', err);
            Alert.alert(
              'Erro',
              'Não foi possível abrir o YouTube. Verifique se o app está instalado.',
              [{ text: 'OK', onPress: () => onClose() }]
            );
          });
        return;
      }
      
      // Para vídeos de servidor (Supabase, etc)
      const isSupabaseStorage = videoUrl.includes('supabase.co/storage') || 
                                videoUrl.includes('supabase.in/storage');
      
      console.log('🗄️ É Supabase Storage?', isSupabaseStorage);
      
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setUseWebView(isSupabaseStorage); // Usar WebView apenas para Supabase
      
      if (isSupabaseStorage) {
        console.log('🌐 USANDO WEBVIEW para Supabase Storage');
      } else {
        console.log('📱 USANDO PLAYER NATIVO para vídeo de servidor');
      }
    }
  }, [visible, videoUrl]);

  const handleClose = () => {
    // Pausar o vídeo ao fechar o modal
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    setIsLoading(true);
    setHasError(false);
    onClose();
  };

  const handlePlaybackStatusUpdate = (playbackStatus: any) => {
    console.log('🎬 VIDEO STATUS:', JSON.stringify(playbackStatus, null, 2));
    
    setStatus(playbackStatus);

    if (playbackStatus.isLoaded) {
      setIsLoading(false);
      console.log('✅ Vídeo carregado com sucesso!');
    }

    if (playbackStatus.error) {
      console.error('❌ Erro no vídeo:', playbackStatus.error);
      
      // Verificar se é erro de extractor (formato não suportado)
      if (playbackStatus.error.includes('extractors') || playbackStatus.error.includes('could read the stream')) {
        console.log('🔄 Tentando WebView como fallback...');
        setUseWebView(true);
        setIsLoading(false);
        setHasError(false);
      } else {
        setHasError(true);
        setIsLoading(false);
        setErrorMessage(`Erro ao carregar vídeo: ${playbackStatus.error}`);
      }
    }
  };

  const handleError = (error: string) => {
    console.error('❌ VIDEO MODAL: Erro:', error);
    setHasError(true);
    setIsLoading(false);
    setErrorMessage(error);
    Alert.alert(
      'Erro no Vídeo',
      `Não foi possível carregar o vídeo. ${error}\n\nURL: ${videoUrl}`,
      [{ text: 'OK' }]
    );
  };

  const getWebViewHTML = (url: string) => {
    // Se for YouTube, usar iframe do YouTube
    const ytId = getYouTubeVideoId(url);
    
    if (ytId) {
      console.log('🎥 Gerando HTML para YouTube ID:', ytId);
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              height: 100%;
              background: #000;
              overflow: hidden;
            }
            .container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .video-wrapper {
              position: relative;
              width: 100%;
              padding-bottom: 56.25%; /* 16:9 */
              height: 0;
              overflow: hidden;
            }
            iframe {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
            }
            .loading {
              color: white;
              text-align: center;
              padding: 20px;
              font-family: -apple-system, system-ui, sans-serif;
            }
            .info {
              color: #888;
              font-size: 12px;
              margin-top: 10px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="loading" id="loading">
              ⏳ Carregando vídeo...<br>
              <span class="info">ID: ${ytId}</span>
            </div>
            <div class="video-wrapper" id="video-wrapper" style="display: none;">
              <iframe
                id="youtube-iframe"
                src="https://www.youtube.com/embed/${ytId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&controls=1&fs=1"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                frameborder="0"
              ></iframe>
            </div>
          </div>
          <script>
            console.log('🎬 Iniciando player do YouTube');
            console.log('📺 Video ID: ${ytId}');
            
            const iframe = document.getElementById('youtube-iframe');
            const loading = document.getElementById('loading');
            const videoWrapper = document.getElementById('video-wrapper');
            
            // Mostrar iframe após um delay
            setTimeout(() => {
              console.log('✅ Mostrando iframe');
              loading.style.display = 'none';
              videoWrapper.style.display = 'block';
              
              // Notificar React Native
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'youtube_ready',
                  videoId: '${ytId}'
                }));
              }
            }, 1000);
            
            // Monitorar carregamento do iframe
            iframe.onload = () => {
              console.log('✅ Iframe carregado');
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'iframe_loaded',
                  videoId: '${ytId}'
                }));
              }
            };
            
            iframe.onerror = (e) => {
              console.error('❌ Erro no iframe:', e);
              loading.innerHTML = '❌ Erro ao carregar vídeo<br><span class="info">Tente abrir no YouTube</span>';
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'iframe_error',
                  error: e.toString()
                }));
              }
            };
            
            // Log de debug
            console.log('📱 UserAgent:', navigator.userAgent);
            console.log('🌐 URL do iframe:', iframe.src);
          </script>
        </body>
        </html>
      `;
    }
    
    // Para outros vídeos (Supabase, etc)
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background: #000;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          video {
            width: 100%;
            max-width: 100vw;
            max-height: 100vh;
            object-fit: contain;
          }
          .error {
            color: white;
            text-align: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .error a {
            color: #3B82F6;
            text-decoration: none;
            display: inline-block;
            margin-top: 10px;
            padding: 10px 20px;
            background: #3B82F6;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <video 
          controls 
          autoplay 
          playsinline
          webkit-playsinline
          preload="metadata"
          controlsList="nodownload"
        >
          <source src="${url}" type="video/mp4">
          <source src="${url}" type="video/webm">
          <source src="${url}" type="video/quicktime">
          <source src="${url}">
          <div class="error">
            ⚠️ Não foi possível reproduzir o vídeo<br>
            <small>Tente abrir diretamente:</small><br>
            <a href="${url}" target="_blank">Abrir Vídeo</a>
          </div>
        </video>
        <script>
          const video = document.querySelector('video');
          
          video.addEventListener('error', function(e) {
            console.error('Video error:', e);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.innerHTML = '⚠️ Erro ao carregar vídeo<br><small>${url}</small>';
            document.body.innerHTML = '';
            document.body.appendChild(errorDiv);
          });
          
          video.addEventListener('loadedmetadata', function() {
            console.log('Video loaded successfully');
          });
        </script>
      </body>
      </html>
    `;
  };

  if (!videoUrl) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar hidden />
        
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: colors.card }]}
            onPress={handleClose}
          >
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.exerciseTitle, { color: colors.text }]} numberOfLines={2}>
              {exerciseName}
            </Text>
            {exerciseDescription && (
              <Text style={[styles.exerciseDescription, { color: colors.textSecondary }]} numberOfLines={1}>
                {exerciseDescription}
              </Text>
            )}
          </View>
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          {useWebView ? (
            <WebView
              key="webview-player"
              source={{ html: getWebViewHTML(videoUrl) }}
              style={styles.webView}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              allowsFullscreenVideo={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              originWhitelist={['*']}
              onMessage={(event) => {
                const data = event.nativeEvent.data;
                console.log('📨 WebView Message:', data);
                
                try {
                  const parsed = JSON.parse(data);
                  console.log('📨 Parsed message:', parsed);
                  
                  if (parsed.type === 'youtube_ready') {
                    console.log('✅ YouTube pronto para reproduzir');
                    setIsLoading(false);
                  } else if (parsed.type === 'iframe_error') {
                    console.error('❌ Erro no iframe do YouTube:', parsed.error);
                    setHasError(true);
                    setErrorMessage('YouTube não pode ser carregado no WebView');
                    setIsLoading(false);
                  }
                } catch (e) {
                  console.log('📨 Mensagem não-JSON:', data);
                }
              }}
              onLoadStart={() => {
                console.log('🌐 WebView: Iniciando carregamento');
                console.log('🌐 HTML sendo carregado:', getWebViewHTML(videoUrl).substring(0, 200) + '...');
                setIsLoading(true);
              }}
              onLoadEnd={() => {
                console.log('✅ WebView: Carregamento concluído');
                setIsLoading(false);
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ WebView Error:', JSON.stringify(nativeEvent, null, 2));
                setHasError(true);
                setErrorMessage(`Erro WebView: ${nativeEvent.description || 'Erro desconhecido'}`);
                setIsLoading(false);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('❌ WebView HTTP Error:', JSON.stringify(nativeEvent, null, 2));
              }}
            />
          ) : (
            <Video
              key="native-player"
              ref={videoRef}
              style={styles.video}
              source={{ uri: videoUrl }}
              useNativeControls={true}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              isLooping={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={(error) => handleError(error)}
            />
          )}

          {/* Loading Indicator */}
          {isLoading && !hasError && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                {useWebView ? 'Carregando no navegador...' : 'Carregando vídeo...'}
              </Text>
            </View>
          )}

          {/* WebView Fallback Indicator */}
          {useWebView && !isLoading && !hasError && (
            <View style={styles.webViewIndicator}>
              <Globe size={20} color="#3B82F6" />
              <Text style={styles.webViewText}>
                {isYouTube ? 'YouTube' : 'Navegador Web'}
              </Text>
            </View>
          )}
          
          {/* Toggle Button - só mostra se não estiver carregando e não tiver erro */}
          {!isLoading && !hasError && (
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => {
                setUseWebView(!useWebView);
                setIsLoading(true);
              }}
            >
              <Text style={styles.toggleButtonText}>
                {useWebView ? '📱 Usar Player Nativo' : '🌐 Usar Navegador'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Error Message */}
          {hasError && (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Erro ao carregar vídeo</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Text style={styles.urlText} numberOfLines={2}>{videoUrl}</Text>
              
              <View style={styles.errorButtons}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setHasError(false);
                    setIsLoading(true);
                    setUseWebView(!useWebView);
                  }}
                >
                  <Text style={styles.retryButtonText}>Tentar Outro Player</Text>
                </TouchableOpacity>
                
                {isYouTube && youtubeVideoId && (
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: '#FF0000' }]}
                    onPress={() => {
                      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
                      Linking.openURL(youtubeUrl).catch(err => 
                        Alert.alert('Erro', 'Não foi possível abrir o YouTube')
                      );
                    }}
                  >
                    <ExternalLink size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.retryButtonText}>Abrir no YouTube</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Video Info */}
        <View style={[styles.videoInfo, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            Instruções do Exercício
          </Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            {exerciseDescription || 'Assista ao vídeo para ver a execução correta do exercício.'}
          </Text>
          
          {/* Debug Info */}
          <Text style={[styles.debugText, { color: colors.textSecondary, marginTop: 12 }]}>
            URL: {videoUrl}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  exerciseTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
  },
  webViewIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  webViewText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: '#3B82F6',
    marginLeft: 6,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#fff',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
  },
  errorTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  urlText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#fff',
  },
  videoInfo: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  infoTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 8,
  },
  infoText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  debugText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    opacity: 0.6,
  },
});
