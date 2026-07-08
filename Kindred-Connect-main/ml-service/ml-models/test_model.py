try:
    print("1. Starting import...")
    import sys
    sys.path.insert(0, '.')
    print("2. Path added:", sys.path[0])
    
    import profile_matching
    print("3. Import SUCCESS!")
    print('✅ Model loaded:', profile_matching._ML_MODEL is not None)
    print('Features:', profile_matching._ML_FEATURE_ORDER)
    
except ImportError as e:
    print("❌ Import failed:", e)
except Exception as e:
    print("❌ Error:", e)