from django.contrib import admin

# Register your models here.
from .models import *

admin.site.register(Element)
admin.site.register(WeaponClass)
admin.site.register(SkillTag)
admin.site.register(SkillPoint)
admin.site.register(Skill)
admin.site.register(Decoration)
admin.site.register(Armour)
