// Test script for AREngineAdapter
import { AREngineAdapter } from './src/utils/ar-engine-adapter.js';

async function testAREngineAdapter() {
  console.log('🧪 AREngineAdapter Test Starting...');
  
  try {
    // Test 1: Get available engines
    console.log('\n1. Testing getAvailableEngines...');
    const availableEngines = await AREngineAdapter.getAvailableEngines();
    console.log('✅ Available engines:', availableEngines);
    
    // Test 2: Get engine info
    console.log('\n2. Testing getEngineInfo...');
    for (const engineType of ['marker', 'webxr']) {
      try {
        const info = await AREngineAdapter.getEngineInfo(engineType);
        console.log(`✅ ${engineType} engine info:`, info);
      } catch (error) {
        console.warn(`⚠️ Error getting ${engineType} engine info:`, error.message);
      }
    }
    
    // Test 3: Auto engine selection
    console.log('\n3. Testing autoSelectEngine...');
    const selectedEngine = await AREngineAdapter.autoSelectEngine();
    console.log('✅ Auto-selected engine:', selectedEngine);
    
    // Test 4: Create engine instance
    console.log('\n4. Testing engine creation...');
    try {
      const engine = await AREngineAdapter.create({
        container: document.createElement('div'),
        preferredEngine: selectedEngine,
        debug: true
      });
      console.log('✅ Engine created successfully:', engine.constructor.name);
      console.log('✅ Engine type:', engine.constructor.getEngineType?.() || 'unknown');
      console.log('✅ Engine is supported:', engine.constructor.isSupported?.() || 'unknown');
    } catch (error) {
      console.error('❌ Engine creation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n🏁 AREngineAdapter Test Complete');
}

// Run test when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testAREngineAdapter);
} else {
  testAREngineAdapter();
}